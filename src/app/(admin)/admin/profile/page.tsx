import { redirect } from 'next/navigation';
import { getServerSession } from '@/lib/auth/session';
import { ProfileForm } from './profile-form';

export default async function ProfilePage() {
  const session = await getServerSession();

  if (!session) {
    redirect('/auth/login');
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-cyan-600 dark:text-cyan-400">
          Profile
        </p>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Your account
        </h1>
      </header>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <ProfileForm
          currentUser={{
            id: session.id,
            email: session.email,
            role: session.role,
            display_name: session.display_name,
          }}
        />
      </div>
    </div>
  );
}
