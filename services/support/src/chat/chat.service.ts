import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import OpenAI from 'openai';
import { Conversation } from './conversation.entity.js';
import { Message, MessageRole } from './message.entity.js';
import { ContextGatherer } from './context-gatherer.js';
import { ActionRunner } from './action-runner.js';
import { TicketsService } from '../tickets/tickets.service.js';
import { TicketStatus, TicketCategory, TicketPriority } from '../tickets/ticket.entity.js';

/** OpenAI tool definitions for the support agent */
const TOOLS: OpenAI.Chat.Completions.ChatCompletionTool[] = [
  {
    type: 'function',
    function: {
      name: 'retry_publish',
      description: 'Retry publishing a failed post',
      parameters: {
        type: 'object',
        properties: {
          postId: { type: 'string', description: 'The post ID to retry' },
          orgId: { type: 'string', description: 'The organization ID' },
        },
        required: ['postId', 'orgId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'reconnect_platform',
      description: 'Initiate reconnection of a disconnected social media platform',
      parameters: {
        type: 'object',
        properties: {
          orgId: { type: 'string', description: 'The organization ID' },
          platform: {
            type: 'string',
            description: 'Platform name (twitter, facebook, instagram, youtube, whatsapp)',
          },
        },
        required: ['orgId', 'platform'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'check_billing',
      description: 'Check the organization billing/subscription status',
      parameters: {
        type: 'object',
        properties: {
          orgId: { type: 'string', description: 'The organization ID' },
        },
        required: ['orgId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'cancel_scheduled_post',
      description: 'Cancel a scheduled post',
      parameters: {
        type: 'object',
        properties: {
          postId: { type: 'string', description: 'The scheduled post ID' },
          orgId: { type: 'string', description: 'The organization ID' },
        },
        required: ['postId', 'orgId'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'escalate_to_human',
      description:
        'Escalate the conversation to a human support agent when the AI cannot resolve the issue',
      parameters: {
        type: 'object',
        properties: {
          reason: { type: 'string', description: 'Why escalation is needed' },
          category: {
            type: 'string',
            enum: ['general', 'billing', 'platform', 'publishing', 'account', 'bug', 'feature_request'],
          },
          priority: {
            type: 'string',
            enum: ['low', 'medium', 'high', 'critical'],
          },
        },
        required: ['reason'],
      },
    },
  },
];

const SYSTEM_PROMPT = `You are the FaithReach Support Agent — a friendly, knowledgeable AI that helps churches and faith organisations manage their social media presence on FaithReach.

Your capabilities:
• Answer questions about posting, scheduling, analytics, billing, and platform connections
• Retry failed publishes
• Reconnect disconnected platforms
• Check billing/subscription status
• Cancel scheduled posts
• Escalate to a human if you cannot resolve the issue

Guidelines:
1. Be warm, concise, and professional — you're serving church staff.
2. If the user's context shows health signals (disconnected platforms, failed posts, billing issues), proactively mention them.
3. Use the provided tools when an action is needed — don't just suggest it, DO it.
4. If you cannot resolve after 2 attempts, escalate to a human with a clear summary.
5. Never make up information about the user's account — only reference the context data provided.
6. For billing questions, always check_billing first to get real-time data.
7. Keep responses under 300 words unless the user asks for detail.`;

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly client: OpenAI | null;

  constructor(
    @InjectRepository(Conversation)
    private readonly convRepo: Repository<Conversation>,
    @InjectRepository(Message)
    private readonly msgRepo: Repository<Message>,
    private readonly contextGatherer: ContextGatherer,
    private readonly actionRunner: ActionRunner,
    private readonly ticketsService: TicketsService,
  ) {
    const apiKey = process.env.OPENAI_API_KEY;
    if (apiKey) {
      this.client = new OpenAI({ apiKey });
      this.logger.log('OpenAI client initialized for support agent');
    } else {
      this.client = null;
      this.logger.warn('OPENAI_API_KEY not set — support chat will use fallback');
    }
  }

  /** Start or resume a conversation */
  async getOrCreateConversation(
    orgId: string,
    userId: string,
    conversationId?: string,
  ): Promise<Conversation> {
    if (conversationId) {
      const existing = await this.convRepo.findOne({
        where: { id: conversationId },
        relations: ['messages'],
      });
      if (existing) return existing;
    }
    const conv = this.convRepo.create({ orgId, userId, messages: [] });
    return this.convRepo.save(conv);
  }

  /** Main chat endpoint — send a message and get AI response */
  async chat(
    orgId: string,
    userId: string,
    userMessage: string,
    conversationId?: string,
  ): Promise<{ conversationId: string; reply: string; actions: Record<string, any>[] }> {
    const conv = await this.getOrCreateConversation(orgId, userId, conversationId);

    // Save user message
    const userMsg = this.msgRepo.create({
      conversationId: conv.id,
      role: MessageRole.USER,
      content: userMessage,
    });
    await this.msgRepo.save(userMsg);

    // If no OpenAI key, return a helpful fallback
    if (!this.client) {
      const fallback =
        'Our AI support agent is currently offline. Your message has been recorded and a support team member will respond shortly.';
      // Auto-create a ticket
      await this.ticketsService.create({
        orgId,
        userId,
        subject: userMessage.slice(0, 120),
        description: userMessage,
        category: TicketCategory.GENERAL,
      });
      const assistantMsg = this.msgRepo.create({
        conversationId: conv.id,
        role: MessageRole.ASSISTANT,
        content: fallback,
      });
      await this.msgRepo.save(assistantMsg);
      return { conversationId: conv.id, reply: fallback, actions: [] };
    }

    // Gather cross-service context
    const context = await this.contextGatherer.gather(orgId, userId);

    // Build message history
    const history = await this.msgRepo.find({
      where: { conversationId: conv.id },
      order: { createdAt: 'ASC' },
    });

    const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
      { role: 'system', content: SYSTEM_PROMPT },
      {
        role: 'system',
        content: `--- USER CONTEXT ---
Organization: ${orgId}
User: ${userId}
Profile: ${JSON.stringify(context.profile, null, 2)}
Billing: ${JSON.stringify(context.billing, null, 2)}
Connected Platforms: ${JSON.stringify(context.platforms, null, 2)}
Recent Posts (last 5): ${JSON.stringify(context.recentPosts, null, 2)}
Scheduled Posts: ${JSON.stringify(context.scheduledPosts, null, 2)}
Recent Payments: ${JSON.stringify(context.recentPayments, null, 2)}
Health Signals: ${context.healthSignals.length > 0 ? context.healthSignals.join('; ') : 'None — everything looks healthy!'}
--- END CONTEXT ---`,
      },
      ...history.map((m) => ({
        role: m.role as 'user' | 'assistant' | 'system',
        content: m.content,
      })),
    ];

    // Call OpenAI with tool-calling
    const allActions: Record<string, any>[] = [];
    let reply = '';

    let response = await this.client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages,
      tools: TOOLS,
      tool_choice: 'auto',
      temperature: 0.4,
      max_tokens: 1000,
    });

    // Handle tool calls in a loop (max 5 iterations to prevent runaway)
    let iterations = 0;
    while (response.choices[0]?.finish_reason === 'tool_calls' && iterations < 5) {
      iterations++;
      const toolCalls = response.choices[0].message.tool_calls || [];

      // Add the assistant's tool-call message
      messages.push(response.choices[0].message);

      for (const tc of toolCalls) {
        const fnName = tc.function.name;
        let fnArgs: Record<string, string>;
        try {
          fnArgs = JSON.parse(tc.function.arguments);
        } catch {
          fnArgs = {};
        }

        let result: string;

        if (fnName === 'escalate_to_human') {
          // Create a ticket for escalation
          const ticket = await this.ticketsService.create({
            orgId,
            userId,
            subject: `[Escalated] ${fnArgs.reason?.slice(0, 100) || 'Support needed'}`,
            description: fnArgs.reason || 'AI agent escalated this conversation.',
            status: TicketStatus.ESCALATED,
            category: (fnArgs.category as TicketCategory) || TicketCategory.GENERAL,
            priority: (fnArgs.priority as TicketPriority) || TicketPriority.HIGH,
          });
          // Link conversation to ticket
          await this.convRepo.update(conv.id, { ticketId: ticket.id });
          result = `Ticket #${ticket.id.slice(0, 8)} created and escalated to the support team. They will follow up within 24 hours.`;
          allActions.push({ action: 'escalate_to_human', ticketId: ticket.id, reason: fnArgs.reason });
        } else {
          // Self-healing action
          result = await this.actionRunner.run(fnName, { ...fnArgs, orgId });
          allActions.push({ action: fnName, args: fnArgs, result });
        }

        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          content: result,
        });
      }

      // Call OpenAI again with tool results
      response = await this.client.chat.completions.create({
        model: 'gpt-4o-mini',
        messages,
        tools: TOOLS,
        tool_choice: 'auto',
        temperature: 0.4,
        max_tokens: 1000,
      });
    }

    reply = response.choices[0]?.message?.content?.trim() || 'I apologize, I wasn\'t able to generate a response. Let me escalate this to our support team.';

    // Save assistant response
    const assistantMsg = this.msgRepo.create({
      conversationId: conv.id,
      role: MessageRole.ASSISTANT,
      content: reply,
      actions: allActions.length > 0 ? allActions : undefined,
    });
    await this.msgRepo.save(assistantMsg);

    return { conversationId: conv.id, reply, actions: allActions };
  }

  /** Get conversation history */
  async getHistory(conversationId: string): Promise<Message[]> {
    return this.msgRepo.find({
      where: { conversationId },
      order: { createdAt: 'ASC' },
    });
  }

  /** Get all conversations for an org */
  async getConversations(orgId: string): Promise<Conversation[]> {
    return this.convRepo.find({
      where: { orgId },
      order: { createdAt: 'DESC' },
    });
  }
}
