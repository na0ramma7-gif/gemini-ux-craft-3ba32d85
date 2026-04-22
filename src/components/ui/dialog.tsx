import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-black/80 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
      className,
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

/**
 * DialogContent renders as a 3-row flex column:
 *   [DialogHeader] (shrink-0)
 *   [middle body wrapper — scrollable] (flex-1, min-h-0)
 *   [DialogFooter] (shrink-0)
 *
 * Any children that are NOT DialogHeader/DialogFooter are auto-wrapped in
 * the scrollable middle so existing dialogs work without changes. Forms
 * (where Footer lives inside <form>) are also handled: if the form contains
 * a DialogFooter, the form itself becomes the flex column body; otherwise
 * the form is treated as scrollable content.
 *
 * Header/Footer are static (no sticky/negative margins) — they're proper
 * flex rows that always stay pinned to the top/bottom of the panel.
 */

// Marker component types so we can identify them in children.
type SlotComponent = React.ComponentType<React.HTMLAttributes<HTMLDivElement>> & { __dialogSlot?: 'header' | 'footer' };

const isSlot = (node: React.ReactNode, slot: 'header' | 'footer'): boolean => {
  if (!React.isValidElement(node)) return false;
  const type = node.type as SlotComponent;
  return type?.__dialogSlot === slot;
};

/** Recursively check whether a tree contains a DialogFooter element. */
const containsSlot = (children: React.ReactNode, slot: 'header' | 'footer'): boolean => {
  let found = false;
  React.Children.forEach(children, (child) => {
    if (found) return;
    if (isSlot(child, slot)) { found = true; return; }
    if (React.isValidElement(child) && (child.props as { children?: React.ReactNode })?.children) {
      if (containsSlot((child.props as { children?: React.ReactNode }).children, slot)) found = true;
    }
  });
  return found;
};

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>
>(({ className, children, ...props }, ref) => {
  // Partition direct children into header / footer / body.
  // We also support the common pattern <Form><form>...<DialogFooter/></form></Form>:
  // if the form subtree owns the footer, we make the form itself the flex column.
  const childArray = React.Children.toArray(children);

  let header: React.ReactNode = null;
  const bodyParts: React.ReactNode[] = [];
  let footer: React.ReactNode = null;

  // First pass: pull out top-level Header/Footer.
  for (const child of childArray) {
    if (isSlot(child, 'header')) header = child;
    else if (isSlot(child, 'footer')) footer = child;
    else bodyParts.push(child);
  }

  // If footer wasn't a top-level child, look for it nested (e.g. inside a <Form><form>).
  // In that case we don't restructure — the consumer is managing its own flex column,
  // but we still wrap the body region so it scrolls correctly.
  const footerNested = !footer && containsSlot(bodyParts, 'footer');

  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        ref={ref}
        className={cn(
          // Mobile: full-screen. Desktop: centered floating card. Always flex column.
          "fixed inset-0 z-50 flex flex-col border-0 bg-background shadow-lg duration-200 overflow-hidden p-0 gap-0 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
          "sm:inset-auto sm:left-[50%] sm:top-[50%] sm:h-auto sm:max-h-[90vh] sm:w-full sm:max-w-lg sm:translate-x-[-50%] sm:translate-y-[-50%] sm:border sm:rounded-lg data-[state=closed]:sm:zoom-out-95 data-[state=open]:sm:zoom-in-95 data-[state=closed]:sm:slide-out-to-left-1/2 data-[state=closed]:sm:slide-out-to-top-[48%] data-[state=open]:sm:slide-in-from-left-1/2 data-[state=open]:sm:slide-in-from-top-[48%]",
          className,
        )}
        {...props}
      >
        {header}
        {/* Body wrapper: always scrollable. Footer (if nested in a form) scrolls
            with the form content — that's still better than being clipped. For
            sticky footer behaviour, place <DialogFooter/> as a direct child of
            <DialogContent/>, not inside a <form>. */}
        <div className={cn(
          "flex-1 min-h-0 overflow-y-auto",
          // Add default padding only when consumer hasn't set one via a wrapping
          // form. We always pad — forms typically use `space-y-4 py-2` which is
          // independent of horizontal padding.
          "px-6 py-4",
          footerNested && "flex flex-col",
        )}>
          {bodyParts}
        </div>
        {footer}
        <DialogPrimitive.Close
          aria-label="Close"
          className="absolute end-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity data-[state=open]:bg-accent data-[state=open]:text-muted-foreground hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none p-1 z-20"
        >
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader: SlotComponent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 px-6 pt-6 pb-3 bg-background flex flex-col space-y-1.5 text-center sm:text-start border-b border-border/50",
      className,
    )}
    {...props}
  />
);
DialogHeader.displayName = "DialogHeader";
DialogHeader.__dialogSlot = 'header';

const DialogFooter: SlotComponent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      "shrink-0 px-6 py-3 bg-background border-t border-border/50 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-2 sm:gap-0",
      className,
    )}
    {...props}
  />
);
DialogFooter.displayName = "DialogFooter";
DialogFooter.__dialogSlot = 'footer';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn("text-lg font-semibold leading-none tracking-tight", className)}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
