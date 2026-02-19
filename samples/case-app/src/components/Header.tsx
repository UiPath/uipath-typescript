import { useAuth } from '../hooks/useAuth';

interface HeaderProps {
  caseTitle?: string;
  onBack?: () => void;
}

export const Header = ({ caseTitle, onBack }: HeaderProps) => {
  const { isAuthenticated, logout } = useAuth();

  return (
    <header className="bg-[#002855] text-white">
      <div className="flex justify-between items-center h-14 px-4">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="flex items-center gap-1 text-gray-300 hover:text-white transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm">Back</span>
            </button>
          )}
          <div className="flex items-center gap-2">
            <div className="bg-[#F26522] text-white px-2 py-1 rounded text-sm font-bold">
              USI
            </div>
            <span className="text-white font-semibold">UMarket</span>
          </div>
          {caseTitle && (
            <div className="flex items-center gap-2 ml-4 text-sm text-gray-300">
              <span>Dashboard</span>
              <span>/</span>
              <span className="text-white">{caseTitle}</span>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-4">
          {isAuthenticated && (
            <>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                <span className="text-sm text-gray-300">Connected</span>
              </div>
              <button
                onClick={logout}
                className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-1.5 rounded text-sm font-medium transition-colors"
              >
                Logout
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
