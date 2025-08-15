"use client"

import { Bell, ChevronDown } from "lucide-react"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { Breadcrumbs } from "@/components/breadcrumbs"
import { UserButton } from "@clerk/nextjs"
import { SignedIn, SignedOut } from "@clerk/nextjs"
import Link from "next/link"

export function TopNavbar() {
  return (
    <header className="flex h-12 sm:h-16 items-center justify-between border-b bg-white px-4 sm:px-6">
      <div className="flex items-center gap-2 sm:gap-4">
        <SidebarTrigger className="h-8 w-8 sm:h-auto sm:w-auto" />
        <div className="hidden sm:block">
          <Breadcrumbs />
        </div>
        {/* Mobile breadcrumbs - simplified */}
        <div className="sm:hidden">
          <Breadcrumbs />
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <SignedIn>
          <UserButton 
            afterSignOutUrl="/" 
            appearance={{
              elements: {
                avatarBox: "h-8 w-8 sm:h-10 sm:w-10"
              }
            }}
          />
        </SignedIn>
        <SignedOut>
          <Button asChild variant="outline" size="sm" className="text-sm">
            <Link href="/sign-in">Sign In</Link>
          </Button>
        </SignedOut>
      </div>
    </header>
  )
}