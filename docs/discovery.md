# Discovery and search

The board uses MiniSearch in the application; it does not require a hosted search account. [`src/lib/board-search.ts`](../src/lib/board-search.ts) builds an index only from the public post records supplied to the board.

Indexed fields are title, description, tags, people (author name and collaborator names), and topic label. Private introductions, account emails, private directory data, and file contents are not indexed. PDF rendering does not add attachment text to search.

Search normalizes Unicode with NFKD, removes combining accents, lowercases, and normalizes “start up” and “start-up” to “startup”. An empty query returns the supplied posts. Multiple terms use AND; prefix matching is enabled. Fuzzy matching applies only to terms at least five characters long, with distance ratio 0.2 and `maxFuzzy: 1`. Ranking boosts title 4, people 3, tags 2, and topic 2; description uses the default boost. This is word matching, not semantic search or general synonym expansion.

Type/topic filters and the board's selected view affect visible results. Search cannot return records that were not loaded. For a missing result, clear filters, verify the post is public and present in the supplied set, and try a distinctive title word. Topic selection uses the saved topic when valid, then known tag associations, then Open possibilities.

Changing topic labels changes the indexed topic text after rebuild. Changing stored IDs requires migration; retain the existing IDs for presentation-only edits. Changing search settings should be checked against representative short terms, accents, multiword queries, misspellings, and collaborator names.

## Following public posts

[`/feed.xml`](../src/app/feed.xml/route.ts) is an RSS 2.0 feed of the 50 most recently published public posts, newest first. Each item has the title, a link to the post's public page, the author's public display name, the publication date, the post type and the topic (its label and its stored ID) as categories, and a short plain-text summary of the description. The feed reads the same public post records as the guest board, so account emails, private introductions, and private directory data never appear in it. Add `?topic=<id>` with a topic ID such as `planet` to follow one topic; an unknown ID returns 404. Responses may be cached for five minutes, and the route skips session handling so they never carry a session cookie. Every page advertises the feed with an RSS autodiscovery link, and item links use `COMMUNITY.canonicalOrigin`.

## Helping people find the repository

When the private repository is ready for public release, use a clear GitHub description: **A self-hosted community board for asks, offers, projects, and member connections. Built with Next.js and Supabase. MIT licensed.**

Suggested GitHub topics: `community-board`, `community-platform`, `collaboration`, `self-hosted`, `open-source`, `nextjs`, `react`, `typescript`, `supabase`, `postgresql`, `minisearch`, and `mit-license`. Use only topics that describe the shipped application. Explain concrete uses in the README: alumni networks, fellowships, volunteer groups, professional associations, and local communities.

Add screenshots of fictional content in both themes and on mobile, a tagged release with a source download, and the installation guide linked near the top of the README. A safe fictional demo can make evaluation easier, but do not expose real member data as a demonstration. Repository topics and descriptive README text improve discovery; they do not guarantee placement in GitHub or web search.

Share the public release through relevant community-building and self-hosting forums, your organization's website, and project directories whose submission criteria Commons meets. Describe what a new operator needs to run it and distinguish software licensing from hosting costs. Maintain issue templates, contribution guidance, release notes, and accurate setup instructions so discovery leads to a usable project. Publication and outreach remain separate decisions from preparing this private repository.

GitHub documents [repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics) and [searchable repository fields](https://docs.github.com/en/search-github/searching-on-github/searching-for-repositories), including descriptions, topics, and README content.
