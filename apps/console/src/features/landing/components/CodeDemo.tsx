import { Stack, Surface, Text } from "strawn";
import type { CodeSnippet } from "../types";

export function CodeDemo({ title, snippets }: { title: string; snippets: CodeSnippet[] }) {
  return (
    <Surface className="code-demo" tone="raised" radius="lg" padding="lg" aria-label={title}>
      <Stack gap="$4">
        <Text size="sm" css={{ fontWeight: "$semibold" }}>{title}</Text>
        {snippets.map((snippet) => (
          <section key={snippet.id} aria-labelledby={`${snippet.id}-label`}>
            <Text id={`${snippet.id}-label`} size="xs" css={{ color: "$mutedForeground", fontFamily: "$mono" }}>
              {snippet.label} · {snippet.language}
            </Text>
            <pre className="code-demo__pre"><code>{snippet.code}</code></pre>
          </section>
        ))}
      </Stack>
    </Surface>
  );
}
