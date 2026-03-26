"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const user_controller_1 = require("./user.controller");
const common_1 = require("@nestjs/common");
describe('UserController', () => {
    let controller;
    let userService;
    beforeEach(() => {
        userService = {
            getOrCreateByClerk: jest.fn(),
            updateByClerk: jest.fn(),
        };
        controller = new user_controller_1.UserController(userService);
    });
    describe('getMe', () => {
        it('returns user for valid clerk request', async () => {
            const user = { id: 'c1', name: 'Test', email: 't@e.com' };
            userService.getOrCreateByClerk.mockResolvedValue(user);
            const req = { user: { sub: 'c1', email: 't@e.com' } };
            const result = await controller.getMe(req);
            expect(result).toEqual(user);
            expect(userService.getOrCreateByClerk).toHaveBeenCalledWith('c1', req.user);
        });
        it('throws NotFoundException when no clerk user on request', async () => {
            const req = { user: undefined };
            await expect(controller.getMe(req)).rejects.toThrow(common_1.NotFoundException);
        });
    });
    describe('updateMe', () => {
        it('updates and returns user', async () => {
            const updated = { id: 'c1', name: 'New', email: 't@e.com' };
            userService.updateByClerk.mockResolvedValue(updated);
            const req = { user: { sub: 'c1', email: 't@e.com' } };
            const result = await controller.updateMe(req, { name: 'New' });
            expect(result).toEqual(updated);
            expect(userService.updateByClerk).toHaveBeenCalledWith('c1', { name: 'New' });
        });
        it('throws NotFoundException when no clerk user on request', async () => {
            const req = { user: undefined };
            await expect(controller.updateMe(req, { name: 'X' })).rejects.toThrow(common_1.NotFoundException);
        });
        it('throws NotFoundException when user not found for update', async () => {
            userService.updateByClerk.mockResolvedValue(null);
            const req = { user: { sub: 'c1', email: 't@e.com' } };
            await expect(controller.updateMe(req, { name: 'X' })).rejects.toThrow(common_1.NotFoundException);
        });
    });
});
//# sourceMappingURL=user.controller.spec.js.map