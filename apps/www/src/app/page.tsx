import Markdown from "react-markdown";
import { siteConfig } from "@/config/site";
import { resume } from "@/data/resume";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-16 px-4 py-8 lowercase selection:bg-black selection:text-white md:py-16 dark:selection:bg-white dark:selection:text-black">
      {/* Header */}
      <header className="flex items-baseline justify-end">
        <nav className="flex gap-4">
          {Object.entries(siteConfig.links).map(([key, href]) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="font-medium text-sm transition-colors hover:text-muted-foreground"
            >
              {key}
            </a>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <section className="space-y-6">
        <h1 className="mb-8 font-bold text-4xl leading-none tracking-tighter md:text-6xl">
          David E. S. Lee
        </h1>
        <div className="prose prose-neutral dark:prose-invert max-w-lg prose-a:font-medium prose-a:text-foreground text-lg text-muted-foreground leading-relaxed prose-p:leading-relaxed prose-a:underline prose-a:decoration-border prose-a:underline-offset-4 prose-a:transition-all hover:prose-a:decoration-foreground">
          <Markdown
            components={{
              a: ({ node, ...props }) => (
                <a
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline decoration-border underline-offset-4 transition-all hover:decoration-foreground"
                  {...props}
                />
              ),
            }}
          >
            {resume.summary}
          </Markdown>
        </div>
      </section>

      {/* Experience */}
      <section>
        <h3 className="mb-6 font-bold text-muted-foreground text-sm">experience</h3>
        <ul className="flex flex-col border-border border-t">
          {resume.experience.map((job) => (
            <li key={`${job.company}-${job.start}`} className="group">
              <div className="flex flex-col space-y-2 border-border border-b py-4">
                <div className="flex items-baseline justify-between">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-lg underline decoration-border underline-offset-4 transition-all hover:decoration-foreground"
                      >
                        {job.company}
                      </a>
                    ) : (
                      <span className="font-bold text-lg">{job.company}</span>
                    )}
                    <span className="text-muted-foreground text-sm sm:before:mr-2 sm:before:content-['-']">
                      {job.role}
                    </span>
                  </div>
                  <span className="ml-4 shrink-0 font-mono text-muted-foreground text-xs tabular-nums">
                    {job.start} — {job.end}
                  </span>
                </div>
                <p className="max-w-xl text-muted-foreground text-sm leading-relaxed">
                  {job.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Education */}
      <section>
        <h3 className="mb-6 font-bold text-muted-foreground text-sm">education</h3>
        <ul className="flex flex-col border-border border-t">
          {resume.education.map((edu) => (
            <li key={edu.school}>
              <div className="flex items-baseline justify-between border-border border-b py-4">
                <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:gap-2">
                  {edu.url ? (
                    <a
                      href={edu.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-lg underline decoration-border underline-offset-4 transition-all hover:decoration-foreground"
                    >
                      {edu.school}
                    </a>
                  ) : (
                    <span className="font-bold text-lg">{edu.school}</span>
                  )}
                  <span className="text-muted-foreground text-sm sm:before:mr-2 sm:before:content-['-']">
                    {edu.degree}
                  </span>
                </div>
                <span className="font-mono text-muted-foreground text-xs tabular-nums">
                  {edu.year}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Skills */}
      <section>
        <h3 className="mb-4 font-bold text-muted-foreground text-sm">skills</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {resume.skills.map((skill) => (
            <span key={skill} className="font-medium text-sm">
              {skill}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
