# Story Sprout Own Model Generator Strategy

## Purpose

This document describes how Story Sprout could continue creating reading stories if OpenAI is unavailable, too expensive, or no longer the preferred provider.

The recommended approach is to build this in stages. Story Sprout should not begin by training a completely new model from every existing family story.

## Recommended Generation Architecture

```text
Primary provider: OpenAI
        |
        | temporary outage, timeout, or provider failure
        v
Backup AI provider or private local model
        |
        | backup model unavailable
        v
Deterministic Story Sprout fallback engine
        |
        | no new generation possible
        v
Saved-story library and clear retry message
```

Every generated story should record which provider created it:

```text
openai
backup_provider
local_model
template_fallback
```

The existing `stories.created_by` field can support this provider tracking.

## Stage 1: Deterministic Fallback Engine

### Estimated effort

Approximately 2–4 development days for an initial pilot version.

### What it does

If OpenAI is unavailable, Story Sprout creates a simpler story using approved story structures and the learner’s settings.

It can use:

- Learner name
- Learner interests
- Age range
- Grade level
- Reading objective
- Story world
- Adventure prompt
- Topics to avoid
- Story length

### Example story structures

#### Mystery

```text
Question -> clue -> investigation -> discovery -> reflection
```

#### Science or invention

```text
Question -> observation -> test -> result -> explanation
```

#### Adventure

```text
Mission -> obstacle -> decision -> consequence -> solution
```

#### Middle-school inquiry

```text
Problem -> competing explanations -> evidence -> decision -> reflection
```

### Output

The fallback should create:

- A title
- Three or more pages
- A reading objective
- Simple vocabulary
- Questions based on the generated pages
- A clear provider label such as `Basic backup story mode`

### Important limitation

A deterministic story is not as creative as an AI-generated story. The adult should see a clear notice:

```text
This story was created using Story Sprout backup story mode.
Please review it before reading it with your child.
```

## Stage 2: Provider Interface

### Estimated effort

Approximately 1–2 development days.

Create one internal interface so the rest of the application does not depend directly on OpenAI:

```text
StoryGenerator
  - generateStory(request)
  - reviseStory(request)
  - generateVocabulary(request)
  - healthCheck()
```

Possible implementations:

```text
OpenAIStoryGenerator
BackupProviderStoryGenerator
LocalModelStoryGenerator
TemplateStoryGenerator
```

The API route should call the interface instead of calling OpenAI directly:

```text
POST /api/stories/generate
        |
        v
StoryGeneratorRouter
        |
        +--> OpenAIStoryGenerator
        +--> BackupProviderStoryGenerator
        +--> TemplateStoryGenerator
```

## Stage 3: Backup AI Provider Or Local Model

### Estimated effort

Approximately 1–2 weeks for a pilot-quality integration.

Possible options:

- Ollama
- llama.cpp
- A Hugging Face model
- A second hosted AI provider
- A private inference server

### Required work

- Add provider configuration through environment variables.
- Add connection and health checks.
- Add timeout handling.
- Add retry rules with limits.
- Add structured JSON output validation.
- Add input and output moderation.
- Add grade-specific prompts.
- Add cost and usage logging.
- Record the provider in `stories.created_by`.
- Make sure the backup provider never receives another family’s private story.

### Example environment variables

```env
STORY_PROVIDER=openai
BACKUP_STORY_PROVIDER=
LOCAL_MODEL_URL=
LOCAL_MODEL_NAME=
OPENAI_ENABLE_MODERATION=true
```

Do not put provider keys or private model URLs in browser JavaScript.

## Stage 4: Quality And Safety Testing

### Estimated effort

Approximately 1–2 additional weeks, depending on the number of providers.

Test every provider against the same cases:

- PreK and kindergarten story
- Grades 1–2 story
- Grades 3–5 story
- Grades 6–8 story
- Vocabulary objective
- Comprehension objective
- Writing response objective
- Learner interests
- Topics to avoid
- Custom story world
- Quick, standard, and long story
- Provider timeout
- Provider outage
- Invalid JSON output
- Unsafe input
- Unsafe output
- Empty output
- Very long prompt

### Quality checks

The story should be checked for:

- Correct reading level guidance
- Valid JSON structure
- Questions answerable from the story
- Answer choices matching the answer
- Vocabulary appearing in the story
- Topics-to-avoid respected
- No inappropriate or unsafe content
- No private data from another learner
- No unsupported curriculum claims

## Training A New Model

### Recommendation

Do this later, only after the fallback system and private pilot are working.

Training or fine-tuning a model is more complex than connecting another provider. It requires:

- A large clean dataset
- Parent permission for using story content
- Removal of names and sensitive child information
- Consistent grade labels
- Consistent reading-objective labels
- Educator-reviewed examples
- Safety examples and refusal examples
- Evaluation benchmarks
- GPU or hosted training costs
- Model hosting and monitoring
- A rollback plan

### Privacy rule

Do not automatically train a shared model on all existing family stories. Existing stories may contain:

- Learner names
- Interests
- Personal experiences
- Sensitive topics
- Family prompts
- Reading activity

Use only data that is properly authorized, sanitized, and reviewed for the intended purpose.

### Better first step: approved retrieval

Before fine-tuning, create an approved library of sanitized examples organized by:

- Grade level
- Reading objective
- Story length
- Theme
- Vocabulary level
- Story structure

Use these examples as patterns, not as text to copy. Never retrieve one family’s private story for another family.

## Story Generation During An Outage

The user experience should be honest and helpful:

```text
Story Sprout is having trouble reaching the story service.

You can try again, create a simpler backup story, or open a saved story.
```

The system should not silently claim that a fallback story was created by OpenAI.

## Database And Monitoring Changes

A robust provider system should record:

- Provider name
- Model name
- Story ID
- Account ID
- Input token count when available
- Output token count when available
- Estimated cost when available
- Failure reason
- Moderation result
- Fallback reason
- Created time

The existing `ai_invocations` and `ai_safety_events` tables can be extended for this purpose.

Operational events should record failures without storing unnecessary child prompts.

## Cost Controls

A fallback system still needs limits:

- Per-account monthly invocation limit
- Per-account daily limit
- Maximum output length by grade
- Maximum request timeout
- Provider-level spending alerts
- Company-wide monthly budget
- Abuse detection
- Concurrent-request protection
- Automatic review or suspension for repeated abuse

The current invocation limit is not the same as a dollar guarantee. A future dollar budget should be added before unrestricted public use.

## Roadmap

### Phase 1: Reliability foundation

Estimated effort: 2–4 days.

- Create the provider interface.
- Keep OpenAI as the primary provider.
- Add a deterministic template fallback.
- Add a provider label to saved stories.
- Add a backup-mode notice.
- Add outage and retry messaging.

### Phase 2: Controlled pilot

Estimated effort: 1–2 weeks.

- Test all grade bands.
- Test story objectives.
- Test topics to avoid.
- Test vocabulary and questions.
- Review stories manually.
- Measure generation failures.
- Measure fallback usage.
- Measure cost per provider.

### Phase 3: Backup model

Estimated effort: 1–2 weeks.

- Select Ollama, llama.cpp, a hosted backup, or another provider.
- Add configuration and health checks.
- Add moderation and structured output validation.
- Add provider-specific cost and usage monitoring.
- Run side-by-side quality tests.

### Phase 4: Approved retrieval library

Estimated effort: 1–3 weeks.

- Select sanitized examples.
- Remove identifying information.
- Obtain the required permission.
- Organize examples by grade and objective.
- Ensure account isolation.
- Test that the system does not copy example text.

### Phase 5: Fine-tuning decision

Estimated effort: 4–8 or more weeks.

Only consider fine-tuning after there is:

- Enough authorized data
- Educator-reviewed training material
- A safety evaluation set
- A budget
- A model-hosting plan
- A privacy review
- A clear quality improvement over the fallback system

## Recommended Decision

For Story Sprout, build this first:

```text
OpenAI primary
  -> deterministic grade-aware fallback
  -> saved-story library when generation is unavailable
```

Then evaluate a local or backup AI model during the private pilot.

Do not train a custom model yet. A reliable fallback engine will be faster, safer, cheaper, and easier to validate than training a new model from children’s stories.
