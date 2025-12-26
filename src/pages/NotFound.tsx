import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute top-20 left-20 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-glow" />
      <div className="absolute bottom-20 right-20 w-80 h-80 bg-accent/20 rounded-full blur-3xl animate-glow" style={{ animationDelay: '1s' }} />
      
      <div className="text-center relative z-10 animate-scale-in p-8">
        <h1 className="mb-4 text-9xl font-bold bg-gradient-primary bg-clip-text text-transparent animate-fade-in">404</h1>
        <p className="mb-6 text-2xl text-muted-foreground animate-fade-up">Oops! Page not found</p>
        <a 
          href="/dashboard" 
          className="inline-block px-8 py-3 text-lg font-semibold text-white bg-gradient-primary rounded-xl hover:opacity-90 transition-all shadow-lg hover:shadow-glow animate-fade-up"
        >
          Return to Dashboard
        </a>
      </div>
    </div>
  );
};

export default NotFound;
