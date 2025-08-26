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
import { useNetworkStatus } from "./hooks/useNetworkStatus";
import { useToast } from "@/components/ui/use-toast";
import { syncService } from "@/services/syncService";
import { useEffect } from "react";

const queryClient = new QueryClient();

const App = () => {
  const { isOnline, wasOffline, resetWasOffline } = useNetworkStatus();
  const { toast } = useToast();

  // Effect to handle online/offline status and auto-sync
  useEffect(() => {
    if (isOnline && wasOffline) {
      // Coming back online after being offline
      const pendingCount = syncService.getPendingMessageCount();
      
      if (pendingCount > 0) {
        toast({
          title: "Back Online!",
          description: `Syncing ${pendingCount} pending messages...`,
        });
        
        // Auto-sync pending messages
        syncService.autoSync().then((result) => {
          if (result.success > 0 || result.failed > 0) {
            toast({
              title: "Sync Complete",
              description: `${result.success} messages sent successfully${result.failed > 0 ? `, ${result.failed} failed` : ''}`,
            });
          }
        }).catch((error) => {
          console.error('Auto-sync failed:', error);
          toast({
            title: "Sync Failed",
            description: "Some messages couldn't be synced. Please try again.",
            variant: "destructive",
          });
        });
      } else {
        toast({
          title: "Back Online!",
          description: "You're connected to the server again.",
        });
      }
      
      // Reset the wasOffline flag
      resetWasOffline();
    } else if (!isOnline && !wasOffline) {
      // Just went offline
      toast({
        title: "You're Offline",
        description: "Messages will be saved and sent when you reconnect.",
        variant: "destructive",
      });
    }
  }, [isOnline, wasOffline, resetWasOffline, toast]);

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