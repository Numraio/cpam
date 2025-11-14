import React from 'react';
import AppShell from '../shared/shell/AppShell';
import CommandPalette from '../navigation/CommandPalette';
import { useCommandPalette } from '@/hooks/useCommandPalette';
import { SWRConfig } from 'swr';

interface AccountLayoutProps {
  children: React.ReactNode;
}

export default function AccountLayout({ children }: AccountLayoutProps) {
  const { open, setOpen } = useCommandPalette();

  return (
    <SWRConfig
      value={{
        revalidateOnFocus: false,
      }}
    >
      <AppShell>
        {children}
        <CommandPalette open={open} onOpenChange={setOpen} />
      </AppShell>
    </SWRConfig>
  );
}
