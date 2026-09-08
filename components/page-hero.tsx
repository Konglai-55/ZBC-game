import { Icon, type IconName } from "@/components/icon";

export function PageHero({ eyebrow, title, description, icon = "grid", children, className = "" }: { eyebrow: string; title: string; description: string; icon?: IconName; children?: React.ReactNode; className?: string }) {
  return (
    <section className={`page-hero${className ? ` ${className}` : ""}`}>
      <div className="page-hero__glow" />
      <div className="shell page-hero__inner">
        <span className="eyebrow"><Icon name={icon} size={15} />{eyebrow}</span>
        <h1>{title}</h1>
        {description && <p>{description}</p>}
        {children}
      </div>
    </section>
  );
}
