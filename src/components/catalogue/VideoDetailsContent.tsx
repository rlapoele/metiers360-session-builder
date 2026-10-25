import {
  formatDuration,
  formatPublishedDate,
} from '@features/catalogue/format';
import type { CatalogueReferences } from '@features/catalogue/api';
import type { Video } from '@lib/api/schemas';
import type { ReactNode } from 'react';
import { Badge } from '@components/ui/badge.tsx';

interface VideoDetailsContentProps {
  video: Video;
  references?: CatalogueReferences;
}

function DetailSection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-muted-foreground text-xs font-bold tracking-wide uppercase">
        {title}
      </h4>
      {children}
    </section>
  );
}

export function VideoDetailsContent({
  video,
  references,
}: VideoDetailsContentProps) {
  const jobLabels = new Map(
    references?.jobs.data.map((job) => [job.code, job.label]),
  );
  const audienceLabels = new Map(
    references?.audiences.data.map((audience) => [audience.id, audience.label]),
  );
  const headsetLabels = new Map(
    references?.headsets.data.map((headset) => [headset.id, headset.name]),
  );

  return (
    <div className="space-y-7">
      <div className="bg-muted aspect-video overflow-hidden rounded-md">
        {video.thumbnail_url ? (
          <img
            src={video.thumbnail_url}
            alt=""
            className="size-full object-cover"
          />
        ) : (
          <div className="text-muted-foreground flex size-full items-center justify-center px-6 text-center text-sm">
            Aperçu indisponible
          </div>
        )}
      </div>

      <div className="space-y-3">
        <h3 className="text-2xl leading-8 font-semibold">{video.title}</h3>
        <p className="text-muted-foreground text-sm font-medium">
          {formatDuration(video.duration_seconds)}
        </p>
        <p className="leading-7">{video.description}</p>
      </div>

      <DetailSection title="Métiers associés">
        <ul className="space-y-3">
          {video.jobs.map((jobCode) => (
            <li key={jobCode}>
              <p className="font-medium">{jobLabels.get(jobCode) ?? jobCode}</p>
              <p className="text-muted-foreground text-sm">ROME {jobCode}</p>
            </li>
          ))}
        </ul>
      </DetailSection>

      <DetailSection title="Publics conseillés">
        <ul className="flex flex-wrap gap-2">
          {video.audiences.map((audienceId) => (
            <li key={audienceId}>
              <Badge variant="secondary">
                {audienceLabels.get(audienceId) ?? audienceId}
              </Badge>
            </li>
          ))}
        </ul>
      </DetailSection>

      <DetailSection title="Casques compatibles">
        {video.compatible_headsets.length > 0 ? (
          <ul className="flex flex-wrap gap-2">
            {video.compatible_headsets.map((headsetId) => (
              <li key={headsetId}>
                <Badge variant="secondary">
                  {headsetLabels.get(headsetId) ?? headsetId}
                </Badge>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-sm">
            Aucun casque compatible renseigné
          </p>
        )}
      </DetailSection>

      <p className="text-muted-foreground border-border border-t pt-5 text-sm">
        Publiée le {formatPublishedDate(video.published_at)}
      </p>
    </div>
  );
}
