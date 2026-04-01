"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var UserService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UserService = void 0;
const common_1 = require("@nestjs/common");
const typeorm_1 = require("@nestjs/typeorm");
const typeorm_2 = require("typeorm");
const user_entity_1 = require("./user.entity");
let UserService = UserService_1 = class UserService {
    userRepository;
    logger = new common_1.Logger(UserService_1.name);
    constructor(userRepository) {
        this.userRepository = userRepository;
    }
    async getOrCreateByClerk(clerkId, clerkPayload) {
        let user = await this.userRepository.findOne({ where: { id: clerkId } });
        if (!user) {
            const email = clerkPayload.email || `${clerkId}@placeholder.local`;
            user = this.userRepository.create({
                id: clerkId,
                email,
                name: clerkPayload.name || clerkPayload.email || 'User',
                imageUrl: clerkPayload.image_url || undefined,
            });
            await this.userRepository.save(user);
        }
        return user;
    }
    async updateByClerk(clerkId, updates) {
        const user = await this.userRepository.findOne({ where: { id: clerkId } });
        if (!user)
            return null;
        const { name, bio, location, organization, role } = updates;
        await this.userRepository.update(clerkId, {
            ...(name !== undefined && { name }),
            ...(bio !== undefined && { bio }),
            ...(location !== undefined && { location }),
            ...(organization !== undefined && { organization }),
            ...(role !== undefined && { role }),
        });
        return this.userRepository.findOne({ where: { id: clerkId } });
    }
    async webhookSync(payload) {
        const { clerkId, email, name, imageUrl, action } = payload;
        if (action === 'delete') {
            await this.userRepository.delete(clerkId);
            this.logger.log(`User deleted via webhook: ${clerkId}`);
            return { ok: true };
        }
        let user = await this.userRepository.findOne({ where: { id: clerkId } });
        if (action === 'create' && !user) {
            user = this.userRepository.create({
                id: clerkId,
                email: email || `${clerkId}@placeholder.local`,
                name: name || 'User',
                imageUrl: imageUrl || undefined,
            });
            await this.userRepository.save(user);
            this.logger.log(`User created via webhook: ${clerkId}`);
        }
        else if (user) {
            if (email)
                user.email = email;
            if (name)
                user.name = name;
            if (imageUrl !== undefined)
                user.imageUrl = imageUrl || undefined;
            await this.userRepository.save(user);
            this.logger.log(`User updated via webhook: ${clerkId}`);
        }
        return { ok: true };
    }
};
exports.UserService = UserService;
exports.UserService = UserService = UserService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, typeorm_1.InjectRepository)(user_entity_1.User)),
    __metadata("design:paramtypes", [typeorm_2.Repository])
], UserService);
//# sourceMappingURL=user.service.js.map