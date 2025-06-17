"use client";
import React, { useState, useEffect } from "react";
import { Sidebar, SidebarBody, SidebarLink } from "../ui/sidebar";
import {
  IconHome,
  IconUsers,
  IconMessageCircle,
  IconSettings,
  IconLogout,
  IconBrain,
  IconBolt,
  IconMaximize,
  IconTerminal,
  IconDatabase,
  IconPlus,
  IconChevronLeft,
  IconChevronsLeft
} from "@tabler/icons-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import SetupAgent from "./../agent/SetupAgent";
import SystemConsole from "../MainComponents/SystemConsole";
import { useTheme } from "./../theme-provider";
import Image from "next/image";

export function TealSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const [showConsole, setShowConsole] = useState(false);
  const [isCopilotActive, setIsCopilotActive] = useState(false);
  const [isAgentModalOpen, setIsAgentModalOpen] = useState(false);
  const { theme } = useTheme();
  const isDarkTheme = theme === 'dark';
  
  // Load autopilot state
  useEffect(() => {
    // Fetch current autopilot status on mount
    fetch('/api/autopilot/status')
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setIsCopilotActive(data.active);
        }
      })
      .catch(err => console.error('Error fetching autopilot status:', err));
  }, []);

  const toggleAutopilot = async () => {
    try {
      const response = await fetch('/api/autopilot/toggle', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (data.success) {
        setIsCopilotActive(data.active);
        console.log(`Autopilot ${data.active ? 'activated' : 'deactivated'}`);
      } else {
        console.error('Failed to toggle autopilot:', data.error);
      }
    } catch (error) {
      console.error('Error toggling autopilot:', error);
    }
  };

  const toggleFullScreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const openAgentModal = () => {
    setIsAgentModalOpen(true);
  };

  const handleCreateBot = () => {
    router.push('/create-bot');
  };

  // Sidebar state
  const [open, setOpen] = useState(false);
  
  // Define links with explicit text-white class for icon
  const links = [
    // {
    //   label: "Dashboard",
    //   href: "/dashboard",
    //   icon: (
    //     <IconWrapper sidebarOpen={open}>
    //       <IconHome className="h-5 w-5 shrink-0 text-teal-300" />
    //     </IconWrapper>
    //   ),
    // },
    // {
    //   label: "Contacts",
    //   href: "#",
    //   icon: (
    //     <IconWrapper sidebarOpen={open}>
    //       <IconUsers className="h-5 w-5 shrink-0 text-teal-300" />
    //     </IconWrapper>
    //   ),
    // },
    // {
    //   label: "Messages",
    //   href: "#",
    //   icon: (
    //     <IconWrapper sidebarOpen={open}>
    //       <IconMessageCircle className="h-5 w-5 shrink-0 text-teal-300" />
    //     </IconWrapper>
    //   ),
    // },
    {
      label: "AI Agents",
      href: "#",
      icon: (
        <IconWrapper isActive={isAgentModalOpen} onClick={openAgentModal} sidebarOpen={open}>
          <IconBrain className="h-5 w-5 shrink-0 text-white" />
        </IconWrapper>
      ),
    },
    {
      label: "Autopilot",
      href: "#",
      icon: (
        <IconWrapper isActive={isCopilotActive} onClick={toggleAutopilot} sidebarOpen={open}>
          <IconBolt className={cn("h-5 w-5 shrink-0", isCopilotActive ? "text-white" : "text-white/70")} />
        </IconWrapper>
      ),
    },
    {
      label: "Create Bot",
      href: "/create-bot",
      icon: (
        <IconWrapper isActive={pathname === '/create-bot'} onClick={handleCreateBot} sidebarOpen={open}>
          <IconPlus className="h-5 w-5 shrink-0 text-white" />
        </IconWrapper>
      ),
    },
    {
      label: "System Console",
      href: "#",
      icon: (
        <IconWrapper isActive={showConsole} onClick={() => setShowConsole(!showConsole)} sidebarOpen={open}>
          <IconTerminal className="h-5 w-5 shrink-0 text-white" />
        </IconWrapper>
      ),
    },
    // {
    //   label: "Fullscreen",
    //   href: "#",
    //   icon: (
    //     <IconWrapper onClick={toggleFullScreen} sidebarOpen={open}>
    //       <IconMaximize className="h-5 w-5 shrink-0 text-teal-300" />
    //     </IconWrapper>
    //   ),
    // },
    // {
    //   label: "Settings",
    //   href: "#",
    //   icon: (
    //     <IconWrapper sidebarOpen={open}>
    //       <IconSettings className="h-5 w-5 shrink-0 text-teal-300" />
    //     </IconWrapper>
    //   ),
    // },
    // {
    //   label: "Logout",
    //   href: "/",
    //   icon: (
    //     <IconWrapper sidebarOpen={open}>
    //       <IconLogout className="h-5 w-5 shrink-0 text-teal-300" />
    //     </IconWrapper>
    //   ),
    // },
  ];

  return (
    <>
      <Sidebar open={open} setOpen={setOpen}>
        <SidebarBody className="relative dark-bg overflow-hidden justify-between gap-10 bg-gradient-to-b from-slate-800/95 via-slate-900/98 to-slate-950/95 border-r border-teal-500/30 shadow-[15px_0_15px_rgba(20,184,166,0.15)] backdrop-blur-md">
          {/* Add style tag to force white text in sidebar */}
          <style jsx global>{`
            .sidebar-link-text {
              color: white !important;
            }
          `}</style>
          
          {/* Spotlight effect */}
          <div className="absolute -top-[150px] -right-[100px] w-[300px] h-[300px] bg-teal-500/10 rounded-full blur-[80px] pointer-events-none"></div>
          <div className="absolute -bottom-[150px] -left-[100px] w-[300px] h-[300px] bg-teal-600/10 rounded-full blur-[100px] pointer-events-none"></div>
          
          {/* Subtle animated glow */}
          {/* <motion.div 
            className="absolute top-1/4 left-1/4 w-1/2 h-1/2 bg-teal-400/5 rounded-full blur-[120px] pointer-events-none"
            animate={{ 
              opacity: [0.3, 0.6, 0.3],
              scale: [1, 1.2, 1],
            }}
            transition={{ 
              duration: 8, 
              repeat: Infinity,
              ease: "easeInOut"
            }}
          /> */}
          
          {/* 3D depth edge lighting */}
          {/* <div className="absolute inset-y-0 left-0 w-[1px] bg-gradient-to-b from-transparent via-teal-500/30 to-transparent"></div>
          <div className="absolute inset-y-0 right-0 w-[1px] bg-gradient-to-b from-transparent via-teal-500/10 to-transparent"></div>
          <div className="absolute inset-x-0 top-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/20 to-transparent"></div>
          <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-teal-500/20 to-transparent"></div>
           */}
          <div className="flex flex-1 flex-col overflow-x-hidden overflow-y-auto relative z-10">
            <div className="flex items-center">
              {open ? <BladexLogo /> : <BladexLogoIcon />}
              
              {/* Close Button */}
              <AnimatePresence>
                {open && (
                  <motion.div
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.2 }}
                    className="ml-auto mr-2"
                  >
                    <motion.button
                      onClick={() => setOpen(false)}
                      whileHover={{ 
                        scale: 1.1,
                        rotate: -5,
                        color: "#2DD4BF"
                      }}
                      whileTap={{ scale: 0.9 }}
                      className="relative p-1.5 bg-gradient-to-br from-slate-700/80 to-slate-900/80 text-teal-300 rounded-lg border border-teal-500/20 shadow-md"
                    >
                      <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-400/10 via-teal-500/5 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300"></div>
                      <IconChevronsLeft className="h-4 w-4" />
                      
                      {/* Glow effect */}
                      <div className="absolute -inset-0.5 rounded-lg bg-teal-500/20 blur-sm opacity-0 hover:opacity-100 transition-opacity duration-300 -z-10"></div>
                    </motion.button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            
            <div className="mt-8 flex flex-col gap-1">
              {links.map((link, idx) => (
                <SidebarLink 
                  key={idx} 
                  link={{
                    ...link,
                    icon: React.cloneElement(link.icon as React.ReactElement, { 
                      sidebarOpen: open 
                    })
                  }}
                  className={cn(
                    "sidebar-text sidebar-link-text text-white hover:bg-teal-800/100 rounded-3xl transition-all duration-200",
                    open ? "px-3 py-2.5" : "px-1 py-2"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="relative z-10">
            {/* commented this part bcz we do not need Profile section */}
          </div>
        </SidebarBody>
      </Sidebar>
      
      {/* SetupAgent Modal */}
      <SetupAgent 
        isOpen={isAgentModalOpen} 
        onClose={() => setIsAgentModalOpen(false)} 
      />
      
      <SystemConsole 
        showConsole={showConsole} 
        setShowConsole={setShowConsole}
        isCopilotActive={isCopilotActive}
      />
      
      {/* Autopilot Button - Fixed position */}
      <motion.button
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={toggleAutopilot}
        className={cn(
          "dark-bg fixed bottom-6 right-6 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 z-50",
          isCopilotActive 
            ? "bg-gradient-to-br from-teal-400 to-teal-600 text-white ring-4 ring-teal-500/20" 
            : "bg-gradient-to-br from-gray-700 to-gray-900 text-gray-300 hover:text-teal-300",
          "backdrop-blur-md border border-white/10"
        )}
      >
        {isCopilotActive ? (
          <motion.div
            animate={{ 
              rotate: [0, 10, 0, -10, 0],
              scale: [1, 1.1, 1]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              repeatType: "reverse"
            }}
          >
            <IconBolt className="h-6 w-6" />
          </motion.div>
        ) : (
          <IconBolt className="h-6 w-6" />
        )}
        
        {isCopilotActive && (
          <motion.div
            className="absolute -inset-2 rounded-full z-0"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: [0.7, 0.4, 0.7],
              scale: [0.95, 1, 0.95]
            }}
            transition={{ 
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            style={{
              background: 'linear-gradient(to right, rgba(20, 184, 166, 0.2), rgba(56, 178, 172, 0.2))'
            }}
          />
        )}
      </motion.button>
    </>
  );
}

// 3D Icon Wrapper Component with modern animations
const IconWrapper = ({ children, isActive = false, onClick, sidebarOpen = true }: { 
  children: React.ReactNode, 
  isActive?: boolean, 
  onClick?: () => void,
  sidebarOpen?: boolean 
}) => {
  return (
    <motion.div
      whileHover={{ 
        scale: 1.1, 
        rotateY: 10,
        z: 10,
      }}
      whileTap={{ scale: 0.9 }}
      animate={isActive ? {
        scale: [1, 1.1, 1],
        rotate: [0, 3, 0, -3, 0],
        transition: { 
          duration: 1.5,
          repeat: Infinity,
          repeatType: "reverse" 
        }
      } : {}}
      onClick={onClick}
      className={cn(
        "dark-bg sidebar-text relative flex items-center justify-center rounded-lg shadow-lg transition-all duration-300",
        // Adjust size based on sidebar state
        sidebarOpen ? "w-9 h-9" : "w-11 h-11 mx-auto",
        isActive 
          ? "bg-gradient-to-br from-teal-600/40 to-teal-800/40 border border-teal-400/40 shadow-[0_0_10px_rgba(20,184,166,0.3)]"
          : "bg-gradient-to-br from-slate-700/50 to-slate-900/50 border border-teal-500/10"
      )}
      style={{ 
        transformStyle: "preserve-3d", 
        perspective: "1000px",
        boxShadow: isActive 
          ? '0 0 15px rgba(20, 184, 166, 0.3), 0 4px 12px rgba(0,0,0,0.15)' 
          : '0 4px 12px rgba(0,0,0,0.1)' 
      }}
    >
      {/* Inner glow */}
      <div className={cn(
        "absolute inset-0 rounded-lg opacity-0 transition-opacity duration-200",
        isActive ? "opacity-100" : "group-hover:opacity-50"
      )}>
        <div className="absolute inset-0 rounded-lg bg-gradient-to-r from-teal-300/10 via-cyan-400/5 to-teal-300/10 animate-pulse-slow"></div>
      </div>
      
      {/* Icon */}
      <div className="relative z-10">
        {React.cloneElement(children as React.ReactElement, { 
          className: cn(
            (children as React.ReactElement).props.className,
            !sidebarOpen && "h-4 w-4 text-teal-300" //  icons when sidebar is collapsed
          )
        })}
      </div>
      
      {/* Bottom lighting effect */}
      <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-teal-500/10 to-transparent rounded-b-lg"></div>
      
      {/* Active indicator glow */}
      {isActive && (
        <motion.div
          className="absolute -inset-1 rounded-lg z-0"
          animate={{ 
            opacity: [0.5, 0.2, 0.5],
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          style={{
            background: 'linear-gradient(to right, rgba(20, 184, 166, 0.2), rgba(56, 178, 172, 0.2))'
          }}
        />
      )}
    </motion.div>
  );
};

export const BladexLogo = () => {
  return (
    <Link
      href="/dashboard"
      className="relative z-20 flex items-center space-x-2 py-4 px-3 group"
    >
      <Image 
        src="/images/bl_removedbg.png" 
        alt="Bladex Logo" 
        width={48} 
        height={48}
        className="object-contain"
      />
      
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="relative"
      >
        <motion.span
          className="text-xl md:text-xl font-bold text-center bg-clip-text text-transparent bg-gradient-to-b from-neutral-50 to-neutral-400 bg-opacity-50 mb-4"
          style={{ textShadow: "0 2px 10px rgba(20, 184, 166, 0.3)" }}
        >
          BLADEX AI
        </motion.span>
      </motion.div>
    </Link>
  );
};

export const BladexLogoIcon = () => {
  return (
    <Link
      href="/dashboard"
      className="relative z-20 flex items-center justify-center py-4"
    >
      <Image 
        src="/images/bl_removedbg.png" 
        alt="Bladex Logo" 
        width={28} 
        height={28}
        className="object-contain"
      />
    </Link>
  );
}; 