import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  Outlet,
  Link,
  createRootRouteWithContext,
  HeadContent,
  Scripts,
} from "@tanstack/react-router";
import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { Toaster } from "sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="text-center">
        <h1 className="text-7xl text-gradient-sunrise">404</h1>
        <p className="mt-2 text-muted-foreground">Página não encontrada</p>
        <Link to="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-primary-foreground">
          Voltar
        </Link>
      </div>
    </div>
  );
}

function ErrorComponent({ error }: { error: Error }) {
  console.error(error);
  return (
    <div className="flex min-h-screen items-center justify-center px-6 text-center">
      <div>
        <h1 className="text-2xl">Algo deu errado</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error.message}</p>
        <a href="/" className="mt-6 inline-block rounded-full bg-primary px-6 py-2 text-primary-foreground">Voltar pro início</a>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1, viewport-fit=cover" },
      { title: "Nutri AI — sua coach de treino e dieta" },
      { name: "description", content: "Treino + dieta com IA adaptativa, ciclo menstrual, accountability e memória longa." },
      { name: "theme-color", content: "#fff7ed" },
      { property: "og:title", content: "Nutri AI — sua coach de treino e dieta" },
      { name: "twitter:title", content: "Nutri AI — sua coach de treino e dieta" },
      { property: "og:description", content: "Treino + dieta com IA adaptativa, ciclo menstrual, accountability e memória longa." },
      { name: "twitter:description", content: "Treino + dieta com IA adaptativa, ciclo menstrual, accountability e memória longa." },
      { property: "og:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/229f9767-4eb1-4daf-b0a8-29d39f6ef866/id-preview-8dbfe579--76712a3d-a742-479d-92f7-2d4495cff543.lovable.app-1778174527620.png" },
      { name: "twitter:image", content: "https://pub-bb2e103a32db4e198524a2e9ed8f35b4.r2.dev/229f9767-4eb1-4daf-b0a8-29d39f6ef866/id-preview-8dbfe579--76712a3d-a742-479d-92f7-2d4495cff543.lovable.app-1778174527620.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { property: "og:type", content: "website" },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      { rel: "stylesheet", href: "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&display=swap" },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><HeadContent /></head>
      <body>{children}<Scripts /></body>
    </html>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Outlet />
        <Toaster position="top-center" richColors />
      </AuthProvider>
    </QueryClientProvider>
  );
}
