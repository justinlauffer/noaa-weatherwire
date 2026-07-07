import Link from "next/link";

import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">Page not found</h1>
      <p className="max-w-md text-sm text-text-secondary">
        The page you requested does not exist or may have been removed.
      </p>
      <Link href="/">
        <Button variant="primary">Back to feed</Button>
      </Link>
    </div>
  );
}
