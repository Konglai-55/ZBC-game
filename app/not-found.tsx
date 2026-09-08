import Link from "next/link";
import { Icon } from "@/components/icon";

export default function NotFound() {
  return <div className="shell not-found"><span>404</span><h1>这片地图还没有开放</h1><p>你访问的页面不存在，或者资源已经移动。</p><Link className="button button--primary" href="/">返回首页 <Icon name="home" size={17} /></Link></div>;
}
