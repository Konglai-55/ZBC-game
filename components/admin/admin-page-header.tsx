import { Icon, type IconName } from "@/components/icon";

export function AdminPageHeader({ eyebrow, title, description, icon, actions }: { eyebrow: string; title: string; description: string; icon: IconName; actions?: React.ReactNode }) {
  return <div className="admin-page-header"><div className="admin-page-header__icon"><Icon name={icon} size={24} /></div><div><span>{eyebrow}</span><h1>{title}</h1><p>{description}</p></div>{actions && <div className="admin-page-header__actions">{actions}</div>}</div>;
}
