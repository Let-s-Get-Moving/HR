#!/bin/bash
# Batch update common styling patterns to Tahoe style

# This script helps identify patterns but manual updates are needed for accuracy
echo "Patterns to update:"
echo "- bg-white/bg-slate/bg-neutral -> bg-[var(--tahoe-panel)]"
echo "- text-white/text-slate/text-neutral -> text-[var(--tahoe-text)]"
echo "- rounded-lg/rounded-xl -> rounded-[20px] or rounded-[14px]"
echo "- shadow-lg/shadow-xl -> shadow-tahoe"
echo "- indigo-600/blue-600 -> var(--tahoe-accent)"
