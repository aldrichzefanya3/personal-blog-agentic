import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <Header />
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 sm:px-6 lg:px-8">
        <div className="prose prose-base prose-gray mx-auto max-w-none dark:prose-invert lg:prose-lg">
          {children}
        </div>
      </main>
      <Footer />
    </>
  );
}
