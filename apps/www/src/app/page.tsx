import Markdown from "react-markdown";
import { siteConfig } from "~/config/site";
import { resume } from "~/data/resume";

export default function Home() {
  return (
    <main className="min-h-screen px-4 py-8 md:py-16 max-w-3xl mx-auto flex flex-col gap-16 lowercase selection:bg-black selection:text-white dark:selection:bg-white dark:selection:text-black">
      {/* Header */}
      <header className="flex justify-end items-baseline">
        <nav className="flex gap-4">
          {Object.entries(siteConfig.links).map(([key, href]) => (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="text-sm font-medium hover:text-muted-foreground transition-colors"
            >
              {key}
            </a>
          ))}
        </nav>
      </header>

      {/* Hero */}
      <section className="space-y-6">
        <h1 className="text-4xl md:text-6xl font-bold tracking-tighter leading-none mb-8">
          David E. S. Lee
        </h1>
        <div className="text-lg text-muted-foreground max-w-lg leading-relaxed prose prose-neutral dark:prose-invert prose-p:leading-relaxed prose-a:font-medium prose-a:text-foreground prose-a:underline prose-a:underline-offset-4 prose-a:decoration-border hover:prose-a:decoration-foreground prose-a:transition-all">
          <Markdown
            components={{
              a: ({ node, ...props }) => (
                <a
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-all"
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
        <h3 className="font-bold text-sm mb-6 text-muted-foreground">
          experience
        </h3>
        <ul className="flex flex-col border-t border-border">
          {resume.experience.map((job) => (
            <li key={`${job.company}-${job.start}`} className="group">
              <div className="flex flex-col py-4 border-b border-border space-y-2">
                <div className="flex justify-between items-baseline">
                  <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                    {job.url ? (
                      <a
                        href={job.url}
                        target="_blank"
                        rel="noreferrer"
                        className="font-bold text-lg underline underline-offset-4 decoration-border hover:decoration-foreground transition-all"
                      >
                        {job.company}
                      </a>
                    ) : (
                      <span className="font-bold text-lg">{job.company}</span>
                    )}
                    <span className="text-sm text-muted-foreground sm:before:content-['-'] sm:before:mr-2">
                      {job.role}
                    </span>
                  </div>
                  <span className="font-mono text-xs text-muted-foreground tabular-nums shrink-0 ml-4">
                    {job.start} — {job.end}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground max-w-xl leading-relaxed">
                  {job.description}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Education */}
      <section>
        <h3 className="font-bold text-sm mb-6 text-muted-foreground">
          education
        </h3>
        <ul className="flex flex-col border-t border-border">
          {resume.education.map((edu) => (
            <li key={edu.school}>
              <div className="flex justify-between items-baseline py-4 border-b border-border">
                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
                  {edu.url ? (
                    <a
                      href={edu.url}
                      target="_blank"
                      rel="noreferrer"
                      className="font-bold text-lg underline underline-offset-4 decoration-border hover:decoration-foreground transition-all"
                    >
                      {edu.school}
                    </a>
                  ) : (
                    <span className="font-bold text-lg">{edu.school}</span>
                  )}
                  <span className="text-sm text-muted-foreground sm:before:content-['-'] sm:before:mr-2">
                    {edu.degree}
                  </span>
                </div>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  {edu.year}
                </span>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* Skills */}
      <section>
        <h3 className="font-bold text-sm mb-4 text-muted-foreground">skills</h3>
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          {resume.skills.map((skill) => (
            <span key={skill} className="text-sm font-medium">
              {skill}
            </span>
          ))}
        </div>
      </section>
    </main>
  );
}
