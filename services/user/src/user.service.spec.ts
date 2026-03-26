import { UserService } from './user.service';
import { User } from './user.entity';
import { Repository } from 'typeorm';

describe('UserService', () => {
  let service: UserService;
  let repo: jest.Mocked<Pick<Repository<User>, 'findOne' | 'create' | 'save' | 'update'>>;

  beforeEach(() => {
    repo = {
      findOne: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
    };
    service = new UserService(repo as unknown as Repository<User>);
  });

  describe('getOrCreateByClerk', () => {
    it('returns existing user if found', async () => {
      const existing: User = {
        id: 'clerk_123',
        name: 'Jane',
        email: 'jane@example.com',
      } as User;
      repo.findOne.mockResolvedValue(existing);

      const result = await service.getOrCreateByClerk('clerk_123', { email: 'jane@example.com' });
      expect(result).toEqual(existing);
      expect(repo.findOne).toHaveBeenCalledWith({ where: { id: 'clerk_123' } });
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('creates a new user if not found', async () => {
      repo.findOne.mockResolvedValue(null);
      const newUser: User = {
        id: 'clerk_456',
        name: 'John',
        email: 'john@example.com',
      } as User;
      repo.create.mockReturnValue(newUser);
      repo.save.mockResolvedValue(newUser);

      const result = await service.getOrCreateByClerk('clerk_456', {
        email: 'john@example.com',
        name: 'John',
      });
      expect(result).toEqual(newUser);
      expect(repo.create).toHaveBeenCalledWith({
        id: 'clerk_456',
        email: 'john@example.com',
        name: 'John',
        imageUrl: undefined,
      });
      expect(repo.save).toHaveBeenCalledWith(newUser);
    });

    it('falls back to email for name if no name in payload', async () => {
      repo.findOne.mockResolvedValue(null);
      const newUser = { id: 'c', name: 'x@y.com', email: 'x@y.com' } as User;
      repo.create.mockReturnValue(newUser);
      repo.save.mockResolvedValue(newUser);

      await service.getOrCreateByClerk('c', { email: 'x@y.com' });
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ name: 'x@y.com' }),
      );
    });
  });

  describe('updateByClerk', () => {
    it('updates and returns the user', async () => {
      const existing = { id: 'clerk_1', name: 'Old', email: 'a@b.com' } as User;
      const updated = { ...existing, name: 'New' } as User;
      repo.findOne.mockResolvedValueOnce(existing).mockResolvedValueOnce(updated);
      repo.update.mockResolvedValue({} as any);

      const result = await service.updateByClerk('clerk_1', { name: 'New' });
      expect(repo.update).toHaveBeenCalledWith('clerk_1', { name: 'New' });
      expect(result).toEqual(updated);
    });

    it('returns null if user not found', async () => {
      repo.findOne.mockResolvedValue(null);

      const result = await service.updateByClerk('no_user', { name: 'X' });
      expect(result).toBeNull();
      expect(repo.update).not.toHaveBeenCalled();
    });
  });
});
