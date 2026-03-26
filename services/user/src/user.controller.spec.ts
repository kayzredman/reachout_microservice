import { UserController } from './user.controller';
import { UserService } from './user.service';
import { NotFoundException } from '@nestjs/common';
import { User } from './user.entity';

describe('UserController', () => {
  let controller: UserController;
  let userService: jest.Mocked<Pick<UserService, 'getOrCreateByClerk' | 'updateByClerk'>>;

  beforeEach(() => {
    userService = {
      getOrCreateByClerk: jest.fn(),
      updateByClerk: jest.fn(),
    };
    controller = new UserController(userService as unknown as UserService);
  });

  describe('getMe', () => {
    it('returns user for valid clerk request', async () => {
      const user = { id: 'c1', name: 'Test', email: 't@e.com' } as User;
      userService.getOrCreateByClerk.mockResolvedValue(user);

      const req = { user: { sub: 'c1', email: 't@e.com' } };
      const result = await controller.getMe(req);

      expect(result).toEqual(user);
      expect(userService.getOrCreateByClerk).toHaveBeenCalledWith('c1', req.user);
    });

    it('throws NotFoundException when no clerk user on request', async () => {
      const req = { user: undefined };
      await expect(controller.getMe(req)).rejects.toThrow(NotFoundException);
    });

  });

  describe('updateMe', () => {
    it('updates and returns user', async () => {
      const updated = { id: 'c1', name: 'New', email: 't@e.com' } as User;
      userService.updateByClerk.mockResolvedValue(updated);

      const req = { user: { sub: 'c1', email: 't@e.com' } };
      const result = await controller.updateMe(req, { name: 'New' });

      expect(result).toEqual(updated);
      expect(userService.updateByClerk).toHaveBeenCalledWith('c1', { name: 'New' });
    });

    it('throws NotFoundException when no clerk user on request', async () => {
      const req = { user: undefined };
      await expect(controller.updateMe(req, { name: 'X' })).rejects.toThrow(NotFoundException);
    });

    it('throws NotFoundException when user not found for update', async () => {
      userService.updateByClerk.mockResolvedValue(null);
      const req = { user: { sub: 'c1', email: 't@e.com' } };
      await expect(controller.updateMe(req, { name: 'X' })).rejects.toThrow(NotFoundException);
    });
  });
});
