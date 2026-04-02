import { Controller, Get, Patch, Param, Body, Query } from '@nestjs/common';
import { AdminService } from './admin.service.js';

@Controller('admin/support')
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /** GET /admin/support/stats — dashboard stats */
  @Get('stats')
  getStats() {
    return this.adminService.getStats();
  }

  /** GET /admin/support/tickets — all open/escalated tickets */
  @Get('tickets')
  getOpenTickets() {
    return this.adminService.getOpenTickets();
  }

  /** GET /admin/support/tickets/:id — single ticket with conversation */
  @Get('tickets/:id')
  getTicketDetail(@Param('id') id: string) {
    return this.adminService.getTicketDetail(id);
  }

  /** PATCH /admin/support/tickets/:id/assign — assign ticket to admin */
  @Patch('tickets/:id/assign')
  assignTicket(
    @Param('id') id: string,
    @Body() body: { assignedTo: string },
  ) {
    return this.adminService.assignTicket(id, body.assignedTo);
  }

  /** PATCH /admin/support/tickets/:id/resolve — admin resolves ticket */
  @Patch('tickets/:id/resolve')
  resolveTicket(
    @Param('id') id: string,
    @Body() body: { summary?: string },
  ) {
    return this.adminService.resolveTicket(id, body.summary);
  }

  /** GET /admin/support/health?orgId=xxx — at-risk signals for an org */
  @Get('health')
  getOrgHealth(@Query('orgId') orgId: string) {
    return this.adminService.getOrgHealth(orgId);
  }
}
