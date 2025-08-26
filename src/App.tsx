import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Login from "./pages/Login";
import Chat from "./pages/Chat";
import NotFound from "./pages/NotFound";
import { useOnlineStatus } from "./hooks/useOnlineStatus"; // Import the new hook
import { useToast } from "@/components/ui/use-toast"; // Import useToast
import { useEffect } from "react"; // Import useEffect

const queryClient = new QueryClient();

const App = () => { // Changed to a block body for useEffect
  const isOnline = useOnlineStatus();
  const { toast } = useToast();

  // Effect to show toast notifications for online/offline status
  useEffect(() => {
    if (isOnline) {
      toast({
        title: "You are back online!",
        description: "Messages will now sync with the server.",
        variant: "success", // Assuming a 'success' variant exists or can be added
      });
    } else {
      toast({
        title: "You are offline.",
        description: "Messages will be sent when you reconnect.",
        variant: "destructive", // Assuming a 'destructive' variant exists or can be added
      });
    }
  }, [isOnline, toast]);

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <Sonner />
            <BrowserRouter>
              <Routes>
                <Route path="/" element={<Navigate to="/chat" replace />} />
                <Route path="/login" element={<Login />} />
                <Route 
                  path="/chat" 
                  element={
                    <ProtectedRoute>
                      <Chat />
                    </ProtectedRoute>
                  } 
                />
                {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </BrowserRouter>
          </TooltipProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}; // End of App component

export default App;