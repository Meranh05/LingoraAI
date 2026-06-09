import Link from "next/link";
import { ArrowLeft, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-2xl items-center">
      <Card className="glass-panel w-full">
        <CardContent className="p-10 text-center">
          <p className="text-sm font-semibold text-primary">404</p>
          <h1 className="mt-2 text-3xl font-bold">Không tìm thấy trang</h1>
          <p className="mt-3 text-muted-foreground">
            Đường dẫn không tồn tại hoặc đã được chuyển sang khu chức năng mới.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Button render={<Link href="/" />}><ArrowLeft /> Về tổng quan</Button>
            <Button variant="outline" render={<Link href="/search" />}><Search /> Tìm chức năng</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
