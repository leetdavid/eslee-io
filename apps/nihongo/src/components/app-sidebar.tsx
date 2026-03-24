"use client";

import { FileText, Languages, Settings } from "lucide-react";
import Link from "next/link";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { YomiLogo } from "@/components/yomi-logo";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useSession } from "@/lib/auth-client";

const data = {
  navMain: [
    {
      title: "Clips",
      url: "/clips",
      icon: <FileText />,
    },
    {
      title: "Translate",
      url: "/translate",
      icon: <Languages />,
    },
  ],
  navSecondary: [
    // {
    //   title: "Get Help",
    //   url: "#",
    //   icon: <CircleHelpIcon />,
    // },
    {
      title: "Settings",
      url: "/settings",
      icon: <Settings />,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { data: session } = useSession();
  const { isMobile, setOpenMobile } = useSidebar();

  const user = {
    name: session?.user?.name ?? "User",
    email: session?.user?.email ?? "",
    avatar: session?.user?.image ?? "",
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" className="data-[slot=sidebar-menu-button]">
              <Link
                href="/clips"
                onClick={() => isMobile && setOpenMobile(false)}
                className="flex cursor-pointer items-center gap-2"
              >
                <YomiLogo showWordmark />
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
