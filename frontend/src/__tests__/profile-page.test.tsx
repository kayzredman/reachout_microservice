import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import ProfilePage from '../app/profile/page';

// Mock next/image to a plain img
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props: any) => {
    const { unoptimized, ...rest } = props;
    return <img {...rest} />;
  },
}));

const stableGetToken = jest.fn().mockResolvedValue('mock-token');

jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
  useAuth: jest.fn(() => ({ getToken: stableGetToken, isLoaded: true })),
}));

import { useUser } from '@clerk/nextjs';
const mockedUseUser = useUser as jest.MockedFunction<typeof useUser>;

// Helper to build a mock Clerk user
function mockClerkUser(overrides = {}) {
  return {
    isLoaded: true,
    isSignedIn: true,
    user: {
      fullName: 'Test User',
      imageUrl: 'https://img.clerk.com/test.png',
      emailAddresses: [{ emailAddress: 'test@example.com' }],
      ...overrides,
    },
  };
}

describe('ProfilePage', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('shows loading when clerk is not loaded', () => {
    mockedUseUser.mockReturnValue({ isLoaded: false, isSignedIn: false, user: undefined } as any);
    render(<ProfilePage />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('shows loading while fetching backend user', () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);
    (global.fetch as jest.Mock).mockReturnValue(new Promise(() => {}));
    render(<ProfilePage />);
    expect(screen.getByText('Loading profile...')).toBeInTheDocument();
  });

  it('displays profile data after successful fetch', async () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);
    const backendUser = {
      name: 'Test User',
      email: 'test@example.com',
      role: 'Pastor',
      organization: 'FaithReach Church',
      bio: 'A great bio',
      location: 'New York',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2025-01-15T00:00:00.000Z',
    };
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => backendUser,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
    });
    expect(screen.getByText('Pastor')).toBeInTheDocument();
    expect(screen.getByText('FaithReach Church')).toBeInTheDocument();
    expect(screen.getByText('A great bio')).toBeInTheDocument();
    expect(screen.getByText('New York')).toBeInTheDocument();
  });

  it('shows error when fetch fails', async () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: false,
      status: 500,
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch user info')).toBeInTheDocument();
    });
  });

  it('shows error when fetch throws', async () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);
    (global.fetch as jest.Mock).mockRejectedValue(new Error('Network error'));

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getByText('Network error')).toBeInTheDocument();
    });
  });

  it('enters edit mode when Edit Profile is clicked', async () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Test User',
        email: 'test@example.com',
        bio: 'My bio',
        location: 'LA',
        organization: '',
      }),
    });

    render(<ProfilePage />);

    await waitFor(() => {
      expect(screen.getAllByText('Test User').length).toBeGreaterThan(0);
    });

    fireEvent.click(screen.getByText('Edit Profile'));

    expect(screen.getByDisplayValue('Test User')).toBeInTheDocument();
    expect(screen.getByDisplayValue('My bio')).toBeInTheDocument();
    expect(screen.getByDisplayValue('LA')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('cancels edit mode', async () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({
        name: 'Test User',
        email: 'test@example.com',
        bio: 'Bio',
        location: 'LA',
        organization: '',
      }),
    });

    render(<ProfilePage />);

    await waitFor(() => screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Edit Profile'));
    expect(screen.getByText('Cancel')).toBeInTheDocument();

    fireEvent.click(screen.getByText('Cancel'));

    expect(screen.getByText('Edit Profile')).toBeInTheDocument();
    expect(screen.queryByText('Save Changes')).not.toBeInTheDocument();
  });

  it('saves edits via PUT and updates display', async () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);

    const original = { name: 'Old Name', email: 'test@example.com', bio: 'Old', location: 'LA', organization: '' };
    const updated = { ...original, name: 'New Name', bio: 'New bio' };

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => original })
      .mockResolvedValueOnce({ ok: true, json: async () => updated });

    render(<ProfilePage />);

    await waitFor(() => screen.getByText('Old Name'));

    fireEvent.click(screen.getByText('Edit Profile'));

    const nameInput = screen.getByDisplayValue('Old Name');
    fireEvent.change(nameInput, { target: { value: 'New Name' } });

    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('New Name')).toBeInTheDocument();
    });

    expect(global.fetch).toHaveBeenCalledTimes(2);
    const putCall = (global.fetch as jest.Mock).mock.calls[1];
    expect(putCall[0]).toBe('/api/user/me');
    expect(putCall[1].method).toBe('PUT');
  });

  it('shows save error when PUT fails', async () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);

    (global.fetch as jest.Mock)
      .mockResolvedValueOnce({ ok: true, json: async () => ({ name: 'User', email: 'u@e.com', organization: '' }) })
      .mockResolvedValueOnce({ ok: false, status: 500 });

    render(<ProfilePage />);

    await waitFor(() => screen.getByText('User'));

    fireEvent.click(screen.getByText('Edit Profile'));
    fireEvent.click(screen.getByText('Save Changes'));

    await waitFor(() => {
      expect(screen.getByText('Failed to save changes')).toBeInTheDocument();
    });
  });

  it('renders profile image from clerk user', async () => {
    mockedUseUser.mockReturnValue(mockClerkUser() as any);
    (global.fetch as jest.Mock).mockResolvedValue({
      ok: true,
      json: async () => ({ name: 'User', email: 'u@e.com' }),
    });

    render(<ProfilePage />);

    await waitFor(() => screen.getByText('User'));
    const img = screen.getByAltText('Profile');
    expect(img).toHaveAttribute('src', 'https://img.clerk.com/test.png');
  });
});
