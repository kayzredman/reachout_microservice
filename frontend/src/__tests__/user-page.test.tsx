
import { render, screen } from '@testing-library/react';
import UserPage from '../app/user/page';

jest.mock('@clerk/nextjs', () => ({
  useUser: jest.fn(),
  UserButton: () => <div>UserButton</div>,
}));

import { useUser } from '@clerk/nextjs';

describe('UserPage', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('shows loading when not loaded', () => {
    useUser.mockReturnValue({ isLoaded: false });
    render(<UserPage />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows not signed in when not signed in', () => {
    useUser.mockReturnValue({ isLoaded: true, isSignedIn: false });
    render(<UserPage />);
    expect(screen.getByText(/not signed in/i)).toBeInTheDocument();
  });

  it('shows user info when signed in', () => {
    useUser.mockReturnValue({
      isLoaded: true,
      isSignedIn: true,
      user: {
        imageUrl: 'test.png',
        fullName: 'Test User',
        username: 'testuser',
        primaryEmailAddress: { emailAddress: 'test@example.com' },
      },
    });
    render(<UserPage />);
    expect(screen.getByText('Test User')).toBeInTheDocument();
    expect(screen.getByText('test@example.com')).toBeInTheDocument();
  });
});
