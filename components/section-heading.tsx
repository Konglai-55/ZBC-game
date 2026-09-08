import Link from "next/link";
import { Icon, type IconName } from "@/components/icon";

type SectionHeadingProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  href?: string;
  icon?: IconName;
  actions?: React.ReactNode;
};

export function SectionHeading({ eyebrow, title, description, href, icon = "sparkles", actions }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <div>
        {eyebrow && <span className="eyebrow"><Icon name={icon} size={15} />{eyebrow}</span>}
        <h2>{title}</h2>
        {description && <p>{description}</p>}
      </div>
      {(href || actions) && <div className="section-heading__actions">{actions}{href && <Link className="text-link" href={href}>查看全部 <Icon name="arrow-right" size={17} /></Link>}</div>}
    </div>
  );
}
