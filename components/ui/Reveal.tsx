"use client";

import type { PropsWithChildren } from "react";
import { motion, useReducedMotion } from "framer-motion";

export function Reveal({ children }: PropsWithChildren) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      variants={{
        hidden: { opacity: 0, y: reduced ? 0 : 24 },
        show: {
          opacity: 1,
          y: 0,
          transition: { type: "spring", stiffness: 120, damping: 16 },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

export function RevealStagger({ children }: PropsWithChildren) {
  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, amount: 0.25 }}
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
      }}
    >
      {children}
    </motion.div>
  );
}
