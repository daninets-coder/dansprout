# Story Sprout AI and Reading Standards

## Purpose

Story Sprout uses reading standards to give every generated story a clear learning purpose. The selected standard is not only displayed after generation. It is sent to the server and included in the AI request so the story language, structure, questions, and vocabulary support the selected reading skill.

The adult chooses the learner, grade level, reading skill, story world, and adventure. The child can help choose the interests and story direction while the adult remains responsible for the account and learner profile.

## Generation Flow

### 1. Select a grade level

The parent or teacher chooses PreK through Grade 8.

The browser requests curriculum options for that grade:

```text
GET /api/curriculum?gradeLevel=1
```

The curriculum records come from the `curriculum_tracks` table in:

```text
server/schema.sql
```

Each curriculum record includes:

- Grade level
- Domain
- Strand
- Standard code
- Learning objective
- Skill focus
- Instructional priority
- Evidence of learning
- Source framework

### 2. Select a reading skill

The reading-skill menu displays the strand and standard code. For example:

```text
Main Idea and Details (1-CMP-1)
```

The plain-English objective appears below the menu so families can understand what the child will practice.

### 3. Send the standard with the story request

When the adult clicks **Generate reading-aligned story**, the browser sends data similar to:

```json
{
  "learnerId": "learner-uuid",
  "prompt": "A child finds a helpful light in a garden.",
  "gradeLevel": "1",
  "domain": "comprehension",
  "standardCode": "1-CMP-1",
  "theme": "Garden",
  "customTheme": "",
  "language": "English"
}
```

The frontend implementation is in:

```text
api-app.js
```

The request is sent to:

```text
POST /api/stories/generate
```

### 4. Validate the request on the server

The server confirms that:

- The learner belongs to the signed-in adult's account.
- The learner ID is valid.
- The grade level is supported.
- The selected standard code is valid for the selected grade.
- The account has AI consent enabled.
- The OpenAI key is configured.
- The account has not reached its AI usage limit.

The server implementation is in:

```text
server/server.js
```

### 5. Look up the curriculum objective

The server uses the selected grade and standard code to retrieve the matching curriculum row from PostgreSQL.

For example, the record may contain:

```json
{
  "gradeLevel": "1",
  "domain": "comprehension",
  "standardCode": "1-CMP-1",
  "strand": "Main Idea and Details",
  "objective": "Identify important details and explain what the story is mostly about.",
  "sourceFramework": "Grade 1 comprehension standards"
}
```

### 6. Send curriculum information to OpenAI

The server includes the curriculum information in the AI request:

```json
{
  "gradeLevel": "1",
  "domain": "comprehension",
  "curriculumObjective": "Identify important details and explain what the story is mostly about.",
  "curriculumStandard": "1-CMP-1",
  "standardsSource": "Grade 1 comprehension standards",
  "prompt": "A child finds a helpful light in a garden."
}
```

The AI is instructed to:

- Write child-safe, developmentally appropriate content.
- Match the selected grade level.
- Use the curriculum objective and standard.
- Create a clear beginning, middle, and ending.
- Include comprehension questions connected to the story.
- Include useful vocabulary words and child-friendly meanings.
- Support reading confidence and conversation.
- Avoid sexual content, hate speech, graphic violence, self-harm, and instructions for wrongdoing.

## Strict AI Output

The AI must return a structured story with these fields:

```text
title
pages
questions
words
readingGoal
```

The server validates the returned structure before saving it. It also checks that:

- The story contains pages.
- The pages are within the allowed length.
- Questions have valid text.
- Vocabulary words and meanings are valid.
- Vocabulary words appear in the story when required.
- The generated content passes safety moderation.

If the response does not match the required structure, the story is not saved.

## What Is Saved With the Story

The selected curriculum information is stored with the story in its metadata:

```json
{
  "gradeLevel": "1",
  "domain": "comprehension",
  "curriculumStandard": "1-CMP-1",
  "curriculumObjective": "Identify important details and explain what the story is mostly about.",
  "standardsSource": "Grade 1 comprehension standards"
}
```

This allows the application to show the connection later when a parent opens a saved story.

The story metadata also supports reading responses and adult review. When a child answers story questions, the reading assessment records the standard code and objective as evidence for the adult.

## Where Parents See the Standard

Parents can see curriculum information in several places:

1. **Story creation:** The selected strand, standard code, and plain-English objective appear under the reading-skill selector.
2. **Curriculum Guide:** The Home screen explains the grade bands and common abbreviations.
3. **Saved story list:** A saved story displays its grade, reading domain, and curriculum information.
4. **Story details:** Opening a story shows the standard code and learning objective.
5. **Reading responses:** Completed responses retain the related standard information for adult review.

## Common Abbreviations

These abbreviations identify broad reading and writing areas:

- `RF` = Reading Foundational Skills
- `RL` = Reading Literature
- `RI` = Reading Informational Text
- `L` = Language
- `W` = Writing

Story Sprout also uses internal labels such as:

```text
1-CMP-1
3-VOC-1
5-WR-1
```

The internal label generally contains:

- The grade level
- A short domain label
- The sequence number for that objective

Examples:

- `1-CMP-1` = Grade 1 comprehension objective 1
- `3-VOC-1` = Grade 3 vocabulary objective 1
- `5-WR-1` = Grade 5 writing-response objective 1

The plain-English objective next to the code is the best explanation for families.

## Grade-Band Overview

### PreK-K

Stories support early language, letter sounds, book knowledge, story retelling, characters, settings, and simple comprehension.

### Grades 1-2

Stories support foundational reading, fluency, vocabulary, sequencing, main idea, details, character understanding, and reading discussion.

### Grades 3-5

Stories support text evidence, theme, point of view, vocabulary, writing about reading, comparing ideas, and explaining character choices.

### Grades 6-8

Stories support text structure, author craft, perspective, argument, evidence-based writing, critical interpretation, and deeper reflection.

## Important Boundary

Story Sprout uses curriculum standards to guide reading practice. It does not automatically determine that a child has mastered a standard. Adult review and the child's reading responses provide evidence that can be discussed and reviewed by a parent or teacher.

The goal is to make standards useful and understandable while keeping the reading experience warm, creative, and connected to the child's interests.
