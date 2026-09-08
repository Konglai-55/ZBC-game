import Link from "next/link";
import { Icon } from "@/components/icon";
import { mediaUrl } from "@/lib/media-url";
import type { ResourceItem } from "@/lib/types";

export function ToolResourceStrip({ resources }: { resources: ResourceItem[] }) {
  if (resources.length === 0) return null;

  return (
    <section className="tool-resource-strip" aria-labelledby="tool-resource-title">
      <div className="tool-resource-strip__head">
        <div>
          <span className="eyebrow"><Icon name="wrench" size={15} />工具资源</span>
          <h2 id="tool-resource-title">常用工具</h2>
        </div>
        <Link href="/resources?type=tools">查看全部 <Icon name="arrow-right" size={15} /></Link>
      </div>
      <div className="tool-resource-strip__list">
        {resources.map((resource) => (
          <Link className="tool-resource-item" href={`/resources/${resource.id}`} key={resource.id}>
            <span className="tool-resource-item__icon">
              {resource.iconUrl ? <img src={mediaUrl(resource.iconUrl)} alt="" /> : <Icon name="wrench" size={22} />}
            </span>
            <span className="tool-resource-item__copy"><strong>{resource.name}</strong><small>{resource.category}</small></span>
            <Icon className="tool-resource-item__arrow" name="arrow-right" size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}
