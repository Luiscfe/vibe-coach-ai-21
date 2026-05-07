import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { motion } from "framer-motion";

export const Route = createFileRoute("/onboarding")({
  component: () => (
    <main className="min-h-screen bg-gradient-soft">
      <div className="mx-auto max-w-md px-6 py-8">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
          <Outlet />
        </motion.div>
      </div>
    </main>
  ),
});
