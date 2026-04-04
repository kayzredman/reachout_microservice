
"use client";
import { UserButton, useUser } from '@clerk/nextjs';
import Image from 'next/image';

export default function UserPage() {
  const { isLoaded, isSignedIn, user } = useUser();

  if (!isLoaded) {
    return <div style={{ padding: 32 }}>Loading...</div>;
  }

  if (!isSignedIn) {
    return <div style={{ padding: 32 }}>You are not signed in.</div>;
  }

  return (
    <div
      style={{
        padding: '24px 8px',
        maxWidth: 420,
        margin: '0 auto',
        width: '100%',
        boxSizing: 'border-box',
        background: '#181b20',
        borderRadius: 24,
        boxShadow: '0 8px 32px rgba(24,27,32,0.18)',
      }}
    >
      <h2
        style={{
          fontSize: 24,
          fontWeight: 700,
          marginBottom: 20,
          textAlign: 'center',
          letterSpacing: '-0.5px',
          color: '#fff',
        }}
      >
        User Profile
      </h2>
      <div
        style={{
          background: '#23262b',
          borderRadius: 18,
          boxShadow: '0 2px 12px rgba(0,0,0,0.12)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 18,
          width: '100%',
        }}
      >
        <div
          style={{
            background: 'linear-gradient(135deg, #2de1fc 60%, #181b20 100%)',
            borderRadius: '50%',
            padding: 4,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(45,114,217,0.10)',
            marginBottom: 4,
          }}
        >
          <Image
            src={user.imageUrl}
            alt="Profile"
            width={80}
            height={80}
            style={{
              borderRadius: '50%',
              objectFit: 'cover',
              border: '2.5px solid #fff',
              background: '#f5f5f5',
              display: 'block',
            }}
          />
        </div>
        <div style={{ textAlign: 'center', width: '100%' }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 20,
              marginBottom: 2,
              wordBreak: 'break-word',
              color: '#fff',
            }}
          >
            {user.fullName || user.username || 'No name'}
          </div>
          <div
            style={{
              color: '#2de1fc',
              fontWeight: 500,
              fontSize: 15,
              marginBottom: 8,
              wordBreak: 'break-all',
            }}
          >
            {user.primaryEmailAddress?.emailAddress || 'No email'}
          </div>
        </div>
        <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 8 }}>
          <UserButton />
        </div>
      </div>
      <style>{`
        @media (max-width: 600px) {
          div[style*='max-width: 420px'] {
            padding: 12px 2vw !important;
          }
          div[style*='padding: 24px 16px'] {
            padding: 16px 4vw !important;
          }
          h2[style*='font-size: 24px'] {
            font-size: 20px !important;
          }
        }
      `}</style>
    </div>
  );
}
