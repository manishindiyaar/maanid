'use client'

import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import { useTheme } from "./../theme-provider"
import { cn } from "./../../lib/utils"
import { motion } from "framer-motion"

interface BackButtonProps {
  onClick?: () => void;
}

export function BackButton({ onClick }: BackButtonProps = {}) {
  const router = useRouter()
  const { theme } = useTheme()
  const isDarkTheme = theme === 'dark'

  const handleClick = () => {
    if (onClick) {
      onClick();
    } else {
      router.push('/dashboard');
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, y: -2 }}
      whileTap={{ scale: 0.95 }}
      onClick={handleClick}
      className={cn(
        "relative p-3 rounded-xl transition-all",
        "before:absolute before:inset-0 before:rounded-xl before:bg-gradient-to-br",
        "before:from-teal-400/80 before:to-teal-600/80",
        "before:transition-all before:duration-300",
        isDarkTheme
          ? [
              "bg-gradient-to-br from-teal-500/20 to-teal-600/20",
              "border border-teal-500/30",
              "shadow-[0_0_15px_rgba(45,212,191,0.15)]",
              "before:opacity-0 hover:before:opacity-10",
              "hover:shadow-[0_0_25px_rgba(45,212,191,0.25)]",
              "hover:border-teal-400/40"
            ]
          : [
              "bg-gradient-to-br from-teal-400/30 to-teal-500/30",
              "border border-teal-400/30",
              "shadow-[0_0_15px_rgba(45,212,191,0.2)]",
              "before:opacity-0 hover:before:opacity-15",
              "hover:shadow-[0_0_25px_rgba(45,212,191,0.3)]",
              "hover:border-teal-300/40"
            ]
      )}
      style={{
        transform: "perspective(1000px) rotateX(10deg)",
      }}
    >
      <ArrowLeft className={cn(
        "w-5 h-5 relative z-10 transition-colors",
        isDarkTheme ? "text-teal-300" : "text-teal-700"
      )} />
    </motion.button>
  )
} 