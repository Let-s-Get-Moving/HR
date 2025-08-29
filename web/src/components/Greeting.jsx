import React from "react";
import { motion } from "framer-motion";

export default function Greeting({ name="HR Manager" }) {
  return (
    <div className="mb-6">
      <motion.div
        initial={{ opacity: 0, y: -8, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        className="text-2xl md:text-3xl font-semibold"
      >
        <span className="opacity-80">Hello, </span>
        <span className="bg-gradient-to-r from-indigo-400 to-teal-300 bg-clip-text text-transparent">
          {name}
        </span> 👋
      </motion.div>
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.85 }}
        transition={{ delay: 0.4 }}
        className="text-sm text-neutral-400"
      >
        Here's your workforce snapshot for today.
      </motion.p>
    </div>
  );
}
