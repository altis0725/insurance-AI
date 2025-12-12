import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "./_core/hooks/useAuth";
import BottomNav from "./components/BottomNav";
import Login from "./pages/Login";
import Home from "./pages/Home";
import RecordingList from "./pages/RecordingList";
import RecordingDetail from "./pages/RecordingDetail";
import Ask from "./pages/Ask";
import Reminders from "./pages/Reminders";
import Calendar from "./pages/Calendar";
import Settings from "./pages/Settings";
import Templates from "./pages/Templates";
import IntentDocument from "./pages/IntentDocument";

function Router() {
  const { isAuthenticated } = useAuth();

  return (
    <Switch>
      <Route path={"/login"} component={Login} />
      <Route path={"/"} component={Home} />
      <Route path={"/recordings"} component={RecordingList} />
      <Route path={"/recordings/:id"} component={RecordingDetail} />
      <Route path={"/ask"} component={Ask} />
      <Route path={"/reminders"} component={Reminders} />
      <Route path={"/calendar"} component={Calendar} />
      <Route path={"/settings"} component={Settings} />
      <Route path={"/settings/templates"} component={Templates} />
      <Route path={"/recordings/:id/intent"} component={IntentDocument} />
      <Route path={"/404"} component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function AppContent() {
  const { isAuthenticated, loading } = useAuth();
  const [location] = useLocation();

  // ボトムナビを表示するページ（認証済みの場合のみ）
  const showBottomNav = isAuthenticated && !loading && !["/404"].includes(location);

  return (
    <>
      <Router />
      {showBottomNav && <BottomNav />}
    </>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <AppContent />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
