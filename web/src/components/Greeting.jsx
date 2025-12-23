import React from "react";
import { motion } from "framer-motion";

export default function Greeting({ name="HR Manager" }) {
  return (
    <div className="mb-6">
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="text-2xl md:text-3xl font-semibold"
      >
        <span className="text-tahoe-text-secondary">Hello, </span>
        <span className="text-tahoe-accent">
          {name}
        </span> 👋
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.2 }}
        className="text-sm text-tahoe-text-muted mt-1"
      >
        Here's your workforce snapshot for today.
      </motion.p>
    </div>
  );
}
