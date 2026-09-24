import './globals.css';
import { AuthProvider } from './lib/authContext';
import Navbar from './components/Navbar';

export const metadata = {
  title: 'Surplus to Shelter — AI Food Rescue Network',
  description: 'Connecting food surplus from restaurants to nearby shelters in minutes.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600&family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-canvas-light text-slate-900 min-h-screen flex flex-col font-sans antialiased selection:bg-biteback-100 selection:text-biteback-900">
        <AuthProvider>
          {/* Navigation Bar & Login Modal */}
          <Navbar />

          {/* Main Content Area */}
          <main className="flex-1">{children}</main>

          {/* Biteback-inspired Editorial Footer */}
          <footer className="bg-white border-t border-canvas-border py-8 text-xs text-slate-500">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <span className="font-mono text-[11px] font-semibold uppercase tracking-wider text-biteback-700 bg-biteback-50 border border-biteback-200 px-2.5 py-0.5 rounded-full">
                  03 // RESCUE NETWORK
                </span>
                <span className="text-slate-400 font-mono text-[11px]">Surplus-to-Shelter AI</span>
              </div>
              
              <p className="text-slate-500 font-sans text-center">
                Stopping edible food waste before it reaches landfills. Built for donors, volunteers & pantries.
              </p>

              <div className="flex items-center gap-3 text-slate-500 font-mono text-[11px]">
                <span className="inline-flex items-center gap-1.5 text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Supabase Live
                </span>
                <span>•</span>
                <span>FastAPI 2.0</span>
              </div>
            </div>
          </footer>
        </AuthProvider>
      </body>
    </html>
  );
}
