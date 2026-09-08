import { Injectable, Logger } from '@nestjs/common';
import { ResumeContentDiff, ModifiedBullet } from './resume-variant.schema';

const SECTION_NAMES = [
  'summary',
  'experience',
  'education',
  'skills',
  'certifications',
  'languages',
  'links',
] as const;

@Injectable()
export class ResumeDiffService {
  private readonly logger = new Logger(ResumeDiffService.name);

  generateDiff(
    base: Record<string, unknown>,
    tailored: Record<string, unknown>,
  ): ResumeContentDiff {
    const diff: ResumeContentDiff = {};

    const sections = this.detectSectionChanges(base, tailored);
    if (sections.added.length > 0) diff.addedSections = sections.added;
    if (sections.removed.length > 0) diff.removedSections = sections.removed;

    const modifiedBullets = this.detectBulletChanges(base, tailored);
    if (modifiedBullets.length > 0) diff.modifiedBullets = modifiedBullets;

    const summaryChange = this.detectSummaryChange(base, tailored);
    if (summaryChange) diff.summaryChange = summaryChange;

    const skillsChange = this.detectSkillsChange(base, tailored);
    if (skillsChange.added.length > 0 || skillsChange.removed.length > 0) {
      diff.skillsChange = skillsChange;
    }

    return diff;
  }

  resolveDiff(
    base: Record<string, unknown>,
    diff: ResumeContentDiff,
  ): Record<string, unknown> {
    const resolved = JSON.parse(JSON.stringify(base)) as Record<
      string,
      unknown
    >;

    if (diff.summaryChange) {
      resolved.summary = diff.summaryChange.after;
    }

    if (diff.skillsChange) {
      const baseSkills = (base.skills as string[]) || [];
      const added = diff.skillsChange.added || [];
      const removed = new Set(diff.skillsChange.removed || []);
      resolved.skills = [
        ...new Set([...baseSkills.filter((s) => !removed.has(s)), ...added]),
      ];
    }

    if (diff.modifiedBullets && diff.modifiedBullets.length > 0) {
      const baseExp = (base.experience as any[]) || [];
      const modifiedBySection = new Map<string, ModifiedBullet[]>();
      for (const m of diff.modifiedBullets) {
        const list = modifiedBySection.get(m.sectionId) || [];
        list.push(m);
        modifiedBySection.set(m.sectionId, list);
      }

      resolved.experience = baseExp.map((exp: any, idx: number) => {
        const mods = modifiedBySection.get(String(idx));
        if (!mods) return exp;
        const bullets = [...(exp.bullets || [])];
        for (const m of mods) {
          if (m.bulletIndex >= 0 && m.bulletIndex < bullets.length) {
            bullets[m.bulletIndex] = m.after;
          }
        }
        return { ...exp, bullets };
      });
    }

    return resolved;
  }

  private detectSectionChanges(
    base: Record<string, unknown>,
    tailored: Record<string, unknown>,
  ): { added: string[]; removed: string[] } {
    const baseKeys = new Set(
      Object.keys(base).filter((k) => SECTION_NAMES.includes(k as any)),
    );
    const tailoredKeys = new Set(
      Object.keys(tailored).filter((k) => SECTION_NAMES.includes(k as any)),
    );

    const added = [...tailoredKeys].filter((k) => !baseKeys.has(k));
    const removed = [...baseKeys].filter((k) => !tailoredKeys.has(k));

    return { added, removed };
  }

  private detectBulletChanges(
    base: Record<string, unknown>,
    tailored: Record<string, unknown>,
  ): ModifiedBullet[] {
    const baseExp = (base.experience as any[]) || [];
    const tailoredExp = (tailored.experience as any[]) || [];

    const modified: ModifiedBullet[] = [];

    for (let i = 0; i < Math.min(baseExp.length, tailoredExp.length); i++) {
      const baseBullets = baseExp[i].bullets || [];
      const tailoredBullets = tailoredExp[i].bullets || [];

      for (
        let j = 0;
        j < Math.min(baseBullets.length, tailoredBullets.length);
        j++
      ) {
        const before = String(baseBullets[j] || '');
        const after = String(tailoredBullets[j] || '');
        if (before !== after && before.trim() && after.trim()) {
          modified.push({
            sectionId: String(i),
            bulletIndex: j,
            before,
            after,
          });
        }
      }

      if (tailoredBullets.length > baseBullets.length) {
        for (let j = baseBullets.length; j < tailoredBullets.length; j++) {
          const after = String(tailoredBullets[j] || '');
          if (after.trim()) {
            modified.push({
              sectionId: String(i),
              bulletIndex: j,
              before: '',
              after,
            });
          }
        }
      }
    }

    return modified;
  }

  private detectSummaryChange(
    base: Record<string, unknown>,
    tailored: Record<string, unknown>,
  ): { before: string; after: string } | null {
    const before = String(base.summary || '');
    const after = String(tailored.summary || '');
    if (before !== after && before.trim() && after.trim()) {
      return { before, after };
    }
    return null;
  }

  private detectSkillsChange(
    base: Record<string, unknown>,
    tailored: Record<string, unknown>,
  ): { added: string[]; removed: string[]; reordered: boolean } {
    const baseSkills = new Set((base.skills as string[]) || []);
    const tailoredSkills = (tailored.skills as string[]) || [];
    const tailoredSet = new Set(tailoredSkills);

    const baseArr = (base.skills as string[]) || [];

    const added = tailoredSkills.filter((s) => !baseSkills.has(s));
    const removed = baseArr.filter((s) => !tailoredSet.has(s));

    const reordered =
      !added.length && !removed.length
        ? JSON.stringify(baseArr) !== JSON.stringify(tailoredSkills)
        : false;

    return { added, removed, reordered };
  }
}
