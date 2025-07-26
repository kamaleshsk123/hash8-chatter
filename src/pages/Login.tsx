import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { MessageCircle, Users, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";

const Login = () => {
  const { signIn, user, loading, signInWithEmail, registerWithEmail } =
    useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [tabLoading, setTabLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Email/password state
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [registerName, setRegisterName] = useState("");
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");

  useEffect(() => {
    if (user) {
      navigate("/chat");
    }
  }, [user, navigate]);

  const handleGoogleSignIn = async () => {
    setError(null);
    setTabLoading(true);
    try {
      await signIn();
      toast({
        title: "Welcome to Hash8 Intranet!",
        description: "You've successfully signed in.",
      });
    } catch (error) {
      setError("Google sign in failed. Please try again.");
      toast({
        title: "Sign in failed",
        description: "Please try again later.",
        variant: "destructive",
      });
    } finally {
      setTabLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTabLoading(true);
    try {
      await signInWithEmail(loginEmail, loginPassword);
      toast({
        title: "Welcome!",
        description: "You've successfully signed in.",
      });
    } catch (err: any) {
      setError(err.message || "Login failed.");
      toast({
        title: "Login failed",
        description: err.message || "Login failed.",
        variant: "destructive",
      });
    } finally {
      setTabLoading(false);
    }
  };

  const handleEmailRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setTabLoading(true);
    try {
      await registerWithEmail(registerEmail, registerPassword, registerName);
      toast({
        title: "Account created!",
        description: "You've successfully registered.",
      });
    } catch (err: any) {
      setError(err.message || "Registration failed.");
      toast({
        title: "Registration failed",
        description: err.message || "Registration failed.",
        variant: "destructive",
      });
    } finally {
      setTabLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-chat flex flex-col items-center justify-center p-2 sm:p-4">
      {/* Mobile branding and welcome text fixed at the top */}
      <div className="block lg:hidden w-full fixed top-0 left-0 z-30 bg-gradient-chat/90 backdrop-blur-sm pt-2 pb-2 border-b border-border">
        <div className="flex flex-col items-center justify-center text-center gap-1">
          <span className="inline-flex items-center gap-2 bg-white/10 rounded-full px-4 py-2 text-primary font-bold text-lg">
            <MessageCircle className="w-6 h-6" /> Hash8 Intranet
          </span>
          <h1 className="text-xl font-bold text-foreground leading-tight">
            Connect with your <span className="text-primary">organization</span>
          </h1>
          <p className="text-sm text-muted-foreground max-w-xs mx-auto">
            Secure, fast, and beautiful group messaging for modern teams.
          </p>
        </div>
      </div>
      {/* Main content with top padding for fixed header on mobile */}
      <div className="w-full max-w-6xl flex flex-col-reverse lg:grid lg:grid-cols-2 gap-4 sm:gap-8 items-center pt-20 lg:pt-0">
        {/* Left side - Branding and features */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
          className="space-y-6 sm:space-y-8 w-full lg:w-auto hidden xs:block lg:block">
          <div className="space-y-3 sm:space-y-4 text-center lg:text-left">
            <motion.div
              initial={{ scale: 0.8 }}
              animate={{ scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="inline-flex items-center gap-2 sm:gap-3 bg-white/10 backdrop-blur-sm rounded-full px-3 py-1.5 sm:px-6 sm:py-3">
              <MessageCircle className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
              <span className="text-lg sm:text-2xl font-bold text-foreground">
                Hash8 Intranet
              </span>
            </motion.div>
            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-tight">
              Connect with your
              <span className="text-primary block">organization</span>
            </h1>
            <p className="text-sm sm:text-lg text-muted-foreground max-w-md mx-auto lg:mx-0">
              Secure, fast, and beautiful group messaging for modern teams. 
              Real-time collaboration made simple.
            </p>
          </div>
          <div className="grid gap-3 sm:gap-4">
            {[
              {
                icon: <Zap className="w-5 h-5" />,
                title: "Lightning Fast",
                description: "Real-time messaging with instant delivery",
              },
              {
                icon: <Users className="w-5 h-5" />,
                title: "Team Groups",
                description: "Organize conversations by teams and projects",
              },
              {
                icon: <MessageCircle className="w-5 h-5" />,
                title: "Rich Messaging",
                description: "Text, emojis, and file sharing in one place",
              },
            ].map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: 0.4 + index * 0.1 }}
                className="flex items-start gap-2 sm:gap-3">
                <div className="bg-primary/10 text-primary p-2 rounded-lg">
                  {feature.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-foreground text-sm sm:text-base">
                    {feature.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
        {/* Right side - Tabbed Login/Register form */}
        <motion.div
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="flex justify-center w-full">
          <Card className="w-full max-w-xs sm:max-w-md shadow-2xl border-0 bg-white/80 backdrop-blur-sm rounded-xl sm:rounded-2xl p-4 sm:p-6">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="w-full grid grid-cols-2 mb-2 ">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="register">Register</TabsTrigger>
              </TabsList>
              <TabsContent value="login">
                <CardHeader className="text-center space-y-2 sm:space-y-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold">
                    Welcome Back
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-base">
                    Sign in with your Google account to join your organization's
                    chat
              </CardDescription>
            </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
              <Button
                onClick={handleGoogleSignIn}
                    disabled={loading || tabLoading}
                    className="w-full h-11 sm:h-12 text-base font-semibold bg-gradient-primary hover:opacity-90 transition-opacity"
                    size="lg">
                    {loading || tabLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </div>
                ) : (
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                    </svg>
                    Continue with Google
                  </div>
                )}
              </Button>
                  <div className="flex items-center my-2">
                    <div className="flex-grow border-t border-muted-foreground/30" />
                    <span className="mx-2 text-xs text-muted-foreground">
                      or
                    </span>
                    <div className="flex-grow border-t border-muted-foreground/30" />
                  </div>
                  <form
                    className="space-y-3 sm:space-y-4"
                    onSubmit={handleEmailLogin}>
                    <Input
                      type="email"
                      placeholder="Email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                      autoComplete="username"
                      disabled={tabLoading}
                      className="h-10 sm:h-12 text-sm sm:text-base"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                      autoComplete="current-password"
                      disabled={tabLoading}
                      className="h-10 sm:h-12 text-sm sm:text-base"
                    />
                    <Button
                      type="submit"
                      className="w-full h-10 sm:h-12"
                      disabled={tabLoading}>
                      {tabLoading ? "Logging in..." : "Login"}
                    </Button>
                  </form>
                  {error && (
                    <div className="text-red-500 text-xs text-center">
                      {error}
                    </div>
                  )}
                  <div className="text-center text-xs text-muted-foreground">
                    By signing in, you agree to our Terms of Service and Privacy
                    Policy
                  </div>
                </CardContent>
              </TabsContent>
              <TabsContent value="register">
                <CardHeader className="text-center space-y-2 sm:space-y-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold">
                    Create Your Account
                  </CardTitle>
                  <CardDescription className="text-xs sm:text-base">
                    Register with your Google account to get started with your
                    organization's chat
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 sm:space-y-6">
                  <Button
                    onClick={handleGoogleSignIn}
                    disabled={loading || tabLoading}
                    className="w-full h-11 sm:h-12 text-base font-semibold bg-gradient-primary hover:opacity-90 transition-opacity"
                    size="lg">
                    {loading || tabLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Registering...
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                          <path
                            fill="currentColor"
                            d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          />
                          <path
                            fill="currentColor"
                            d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          />
                          <path
                            fill="currentColor"
                            d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          />
                        </svg>
                        Register with Google
                      </div>
                    )}
                  </Button>
                  <div className="flex items-center my-2">
                    <div className="flex-grow border-t border-muted-foreground/30" />
                    <span className="mx-2 text-xs text-muted-foreground">
                      or
                    </span>
                    <div className="flex-grow border-t border-muted-foreground/30" />
                  </div>
                  <form
                    className="space-y-3 sm:space-y-4"
                    onSubmit={handleEmailRegister}>
                    <Input
                      type="text"
                      placeholder="Name"
                      value={registerName}
                      onChange={(e) => setRegisterName(e.target.value)}
                      required
                      autoComplete="name"
                      disabled={tabLoading}
                      className="h-10 sm:h-12 text-sm sm:text-base"
                    />
                    <Input
                      type="email"
                      placeholder="Email"
                      value={registerEmail}
                      onChange={(e) => setRegisterEmail(e.target.value)}
                      required
                      autoComplete="username"
                      disabled={tabLoading}
                      className="h-10 sm:h-12 text-sm sm:text-base"
                    />
                    <Input
                      type="password"
                      placeholder="Password"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                      autoComplete="new-password"
                      disabled={tabLoading}
                      className="h-10 sm:h-12 text-sm sm:text-base"
                    />
                    <Button
                      type="submit"
                      className="w-full h-10 sm:h-12"
                      disabled={tabLoading}>
                      {tabLoading ? "Registering..." : "Register"}
                    </Button>
                  </form>
                  {error && (
                    <div className="text-red-500 text-xs text-center">
                      {error}
                    </div>
                  )}
              <div className="text-center text-xs text-muted-foreground">
                    By registering, you agree to our Terms of Service and
                    Privacy Policy
              </div>
            </CardContent>
              </TabsContent>
            </Tabs>
          </Card>
        </motion.div>
      </div>
    </div>
  );
};

export default Login;
