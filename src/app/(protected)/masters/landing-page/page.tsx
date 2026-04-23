'use client';

import { useState, useEffect } from 'react';
import { useToast } from '@/context/ToastContext';
import { landingPageService, LandingPageData, CategoryItem, StepItem, FeatureItem, CommentItem, StatItem } from '@/services/landingPageService';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import {
  Save, Plus, Trash2, Globe, Star, Layers, Zap, MessageSquare, BarChart2, ChevronDown, ChevronUp,
} from 'lucide-react';

const TABS = [
  { key: 'hero', label: 'Hero', icon: Globe },
  { key: 'avatar_categories', label: 'Avatar Categories', icon: Layers },
  { key: 'how_it_works', label: 'How It Works', icon: Star },
  { key: 'features', label: 'Features', icon: Zap },
  { key: 'social_proof', label: 'Social Proof', icon: MessageSquare },
  { key: 'stats', label: 'Stats', icon: BarChart2 },
] as const;

type TabKey = typeof TABS[number]['key'];

function Field({ label, value, onChange, textarea = false, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; textarea?: boolean; placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {textarea ? (
        <textarea
          className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[80px]"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
        />
      ) : (
        <Input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} className="text-sm" />
      )}
    </div>
  );
}

export default function LandingPageManager() {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<TabKey | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>('hero');
  const [data, setData] = useState<LandingPageData>({});

  useEffect(() => {
    (async () => {
      try {
        const result = await landingPageService.get();
        setData(result);
      } catch (e: any) {
        showToast(e.message || 'Failed to load landing page data', 'error');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const save = async (section: TabKey) => {
    setSaving(section);
    try {
      const updated = await landingPageService.update({ [section]: data[section] });
      setData(updated);
      showToast('Section saved successfully', 'success');
    } catch (e: any) {
      showToast(e.message || 'Failed to save', 'error');
    } finally {
      setSaving(null);
    }
  };

  const updateHero = (key: string, val: string) =>
    setData(d => ({ ...d, hero: { ...d.hero, [key]: val } }));

  const updateCatSection = (key: string, val: string) =>
    setData(d => ({ ...d, avatar_categories: { ...d.avatar_categories, [key]: val } }));

  const updateCategory = (i: number, key: string, val: string) =>
    setData(d => {
      const cats = [...(d.avatar_categories?.categories ?? [])];
      cats[i] = { ...cats[i], [key]: val };
      return { ...d, avatar_categories: { ...d.avatar_categories, categories: cats } };
    });

  const addCategory = () =>
    setData(d => ({ ...d, avatar_categories: { ...d.avatar_categories, categories: [...(d.avatar_categories?.categories ?? []), { title: '', image_url: '' }] } }));

  const removeCategory = (i: number) =>
    setData(d => {
      const cats = [...(d.avatar_categories?.categories ?? [])];
      cats.splice(i, 1);
      return { ...d, avatar_categories: { ...d.avatar_categories, categories: cats } };
    });

  const updateHiwSection = (key: string, val: string) =>
    setData(d => ({ ...d, how_it_works: { ...d.how_it_works, [key]: val } }));

  const updateStep = (i: number, key: string, val: string) =>
    setData(d => {
      const steps = [...(d.how_it_works?.steps ?? [])];
      steps[i] = { ...steps[i], [key]: val };
      return { ...d, how_it_works: { ...d.how_it_works, steps } };
    });

  const addStep = () =>
    setData(d => ({ ...d, how_it_works: { ...d.how_it_works, steps: [...(d.how_it_works?.steps ?? []), { number: '', title: '', description: '', image_url: '' }] } }));

  const removeStep = (i: number) =>
    setData(d => {
      const steps = [...(d.how_it_works?.steps ?? [])];
      steps.splice(i, 1);
      return { ...d, how_it_works: { ...d.how_it_works, steps } };
    });

  const updateFeatSection = (key: string, val: string) =>
    setData(d => ({ ...d, features: { ...d.features, [key]: val } }));

  const updateFeature = (i: number, key: string, val: string) =>
    setData(d => {
      const features = [...(d.features?.features ?? [])];
      features[i] = { ...features[i], [key]: val };
      return { ...d, features: { ...d.features, features } };
    });

  const addFeature = () =>
    setData(d => ({ ...d, features: { ...d.features, features: [...(d.features?.features ?? []), { title: '', description: '', tag: '', color: 'from-blue-500 to-indigo-600' }] } }));

  const removeFeature = (i: number) =>
    setData(d => {
      const features = [...(d.features?.features ?? [])];
      features.splice(i, 1);
      return { ...d, features: { ...d.features, features } };
    });

  const updateSpSection = (key: string, val: string) =>
    setData(d => ({ ...d, social_proof: { ...d.social_proof, [key]: val } }));

  const updateComment = (i: number, key: string, val: string) =>
    setData(d => {
      const comments = [...(d.social_proof?.comments ?? [])];
      comments[i] = { ...comments[i], [key]: val };
      return { ...d, social_proof: { ...d.social_proof, comments } };
    });

  const addComment = () =>
    setData(d => ({ ...d, social_proof: { ...d.social_proof, comments: [...(d.social_proof?.comments ?? []), { name: '', text: '', avatar_url: '' }] } }));

  const removeComment = (i: number) =>
    setData(d => {
      const comments = [...(d.social_proof?.comments ?? [])];
      comments.splice(i, 1);
      return { ...d, social_proof: { ...d.social_proof, comments } };
    });

  const updateStat = (i: number, key: string, val: string) =>
    setData(d => {
      const stats = [...(d.stats ?? [])];
      stats[i] = { ...stats[i], [key]: val };
      return { ...d, stats };
    });

  const addStat = () =>
    setData(d => ({ ...d, stats: [...(d.stats ?? []), { value: '', label: '' }] }));

  const removeStat = (i: number) =>
    setData(d => {
      const stats = [...(d.stats ?? [])];
      stats.splice(i, 1);
      return { ...d, stats };
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Landing Page Manager</h1>
        <p className="text-gray-500 text-sm mt-1">Edit each section of the client landing page from here.</p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition ${
              activeTab === key
                ? 'bg-blue-600 text-white shadow'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ── HERO ── */}
      {activeTab === 'hero' && (
        <Card>
          <CardHeader>
            <CardTitle>Hero Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Badge Text" value={data.hero?.badge_text ?? ''} onChange={v => updateHero('badge_text', v)} placeholder="Next-Gen AI Avatar Platform" />
              <Field label="CTA Button Label" value={data.hero?.cta_button ?? ''} onChange={v => updateHero('cta_button', v)} placeholder="GET STARTED" />
              <Field label="Headline (Line 1)" value={data.hero?.headline ?? ''} onChange={v => updateHero('headline', v)} placeholder="Talk to an AI" />
              <Field label="Headline Highlight" value={data.hero?.headline_highlight ?? ''} onChange={v => updateHero('headline_highlight', v)} placeholder="That Truly" />
              <Field label="Headline (Line 2)" value={data.hero?.subheadline ?? ''} onChange={v => updateHero('subheadline', v)} placeholder="Knows You" />
              <Field label="Hero GIF / Image URL" value={data.hero?.gif_url ?? ''} onChange={v => updateHero('gif_url', v)} placeholder="https://..." />
              <Field label="Memory Badge Title" value={data.hero?.memory_badge_title ?? ''} onChange={v => updateHero('memory_badge_title', v)} />
              <Field label="Memory Badge Subtitle" value={data.hero?.memory_badge_subtitle ?? ''} onChange={v => updateHero('memory_badge_subtitle', v)} />
              <Field label="Security Badge Title" value={data.hero?.security_badge_title ?? ''} onChange={v => updateHero('security_badge_title', v)} />
              <Field label="Security Badge Subtitle" value={data.hero?.security_badge_subtitle ?? ''} onChange={v => updateHero('security_badge_subtitle', v)} />
            </div>
            <Field label="Description" value={data.hero?.description ?? ''} onChange={v => updateHero('description', v)} textarea placeholder="SummonMind gives you..." />
            <div className="flex justify-end">
              <Button onClick={() => save('hero')} disabled={saving === 'hero'}>
                <Save size={14} className="mr-2" /> {saving === 'hero' ? 'Saving...' : 'Save Hero'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── AVATAR CATEGORIES ── */}
      {activeTab === 'avatar_categories' && (
        <Card>
          <CardHeader>
            <CardTitle>Avatar Categories Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Section Label" value={data.avatar_categories?.section_label ?? ''} onChange={v => updateCatSection('section_label', v)} placeholder="Avatar Categories" />
              <Field label="Section Title" value={data.avatar_categories?.section_title ?? ''} onChange={v => updateCatSection('section_title', v)} placeholder="Explore Avatar Categories" />
              <Field label="Section Description" value={data.avatar_categories?.section_description ?? ''} onChange={v => updateCatSection('section_description', v)} placeholder="Start with the category..." />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Categories</h3>
                <Button variant="outline" size="sm" onClick={addCategory}><Plus size={14} className="mr-1" />Add</Button>
              </div>
              <div className="space-y-3">
                {(data.avatar_categories?.categories ?? []).map((cat, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Title" value={cat.title} onChange={v => updateCategory(i, 'title', v)} placeholder="Skill Intelligence" />
                      <Field label="Image / GIF URL" value={cat.image_url} onChange={v => updateCategory(i, 'image_url', v)} placeholder="https://..." />
                    </div>
                    <button onClick={() => removeCategory(i)} className="mt-6 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => save('avatar_categories')} disabled={saving === 'avatar_categories'}>
                <Save size={14} className="mr-2" /> {saving === 'avatar_categories' ? 'Saving...' : 'Save Categories'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── HOW IT WORKS ── */}
      {activeTab === 'how_it_works' && (
        <Card>
          <CardHeader>
            <CardTitle>How It Works Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Section Label" value={data.how_it_works?.section_label ?? ''} onChange={v => updateHiwSection('section_label', v)} placeholder="Simple Steps" />
              <Field label="Section Title" value={data.how_it_works?.section_title ?? ''} onChange={v => updateHiwSection('section_title', v)} placeholder="How It Works" />
              <Field label="Section Description" value={data.how_it_works?.section_description ?? ''} onChange={v => updateHiwSection('section_description', v)} placeholder="From sign-up to..." />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Steps</h3>
                <Button variant="outline" size="sm" onClick={addStep}><Plus size={14} className="mr-1" />Add Step</Button>
              </div>
              <div className="space-y-3">
                {(data.how_it_works?.steps ?? []).map((step, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Step Number" value={step.number} onChange={v => updateStep(i, 'number', v)} placeholder="01" />
                      <Field label="Title" value={step.title} onChange={v => updateStep(i, 'title', v)} placeholder="Choose an AI Avatar" />
                      <Field label="Image / GIF URL" value={step.image_url} onChange={v => updateStep(i, 'image_url', v)} placeholder="https://..." />
                      <Field label="Description" value={step.description} onChange={v => updateStep(i, 'description', v)} placeholder="Browse avatars..." textarea />
                    </div>
                    <button onClick={() => removeStep(i)} className="mt-6 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => save('how_it_works')} disabled={saving === 'how_it_works'}>
                <Save size={14} className="mr-2" /> {saving === 'how_it_works' ? 'Saving...' : 'Save Steps'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── FEATURES ── */}
      {activeTab === 'features' && (
        <Card>
          <CardHeader>
            <CardTitle>Features Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Section Label" value={data.features?.section_label ?? ''} onChange={v => updateFeatSection('section_label', v)} placeholder="Platform Features" />
              <Field label="Section Title" value={data.features?.section_title ?? ''} onChange={v => updateFeatSection('section_title', v)} placeholder="Why SummonMind is Different" />
              <Field label="Section Description" value={data.features?.section_description ?? ''} onChange={v => updateFeatSection('section_description', v)} placeholder="We combine cutting-edge..." />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Feature Cards</h3>
                <Button variant="outline" size="sm" onClick={addFeature}><Plus size={14} className="mr-1" />Add Feature</Button>
              </div>
              <div className="space-y-3">
                {(data.features?.features ?? []).map((feat, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-3">
                      <Field label="Title" value={feat.title} onChange={v => updateFeature(i, 'title', v)} placeholder="Lifelike AI Avatars" />
                      <Field label="Tag" value={feat.tag} onChange={v => updateFeature(i, 'tag', v)} placeholder="Video + Voice" />
                      <Field label="Gradient Color (Tailwind)" value={feat.color} onChange={v => updateFeature(i, 'color', v)} placeholder="from-blue-500 to-indigo-600" />
                      <Field label="Description" value={feat.description} onChange={v => updateFeature(i, 'description', v)} placeholder="Talk to AI avatars..." textarea />
                    </div>
                    <button onClick={() => removeFeature(i)} className="mt-6 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => save('features')} disabled={saving === 'features'}>
                <Save size={14} className="mr-2" /> {saving === 'features' ? 'Saving...' : 'Save Features'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── SOCIAL PROOF ── */}
      {activeTab === 'social_proof' && (
        <Card>
          <CardHeader>
            <CardTitle>Social Proof & CTA Section</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Field label="Section Label" value={data.social_proof?.section_label ?? ''} onChange={v => updateSpSection('section_label', v)} placeholder="Early User Feedback" />
              <Field label="Section Title" value={data.social_proof?.section_title ?? ''} onChange={v => updateSpSection('section_title', v)} placeholder="Early Results From Our Users" />
              <Field label="Section Description" value={data.social_proof?.section_description ?? ''} onChange={v => updateSpSection('section_description', v)} placeholder="Early adopters are..." />
            </div>

            <div className="border-t pt-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Comments</h3>
                <Button variant="outline" size="sm" onClick={addComment}><Plus size={14} className="mr-1" />Add Comment</Button>
              </div>
              <div className="space-y-3">
                {(data.social_proof?.comments ?? []).map((c, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-3">
                      <Field label="Name" value={c.name} onChange={v => updateComment(i, 'name', v)} placeholder="User Name" />
                      <Field label="Avatar Image URL" value={c.avatar_url} onChange={v => updateComment(i, 'avatar_url', v)} placeholder="/p1.jpg or https://..." />
                      <Field label="Comment Text" value={c.text} onChange={v => updateComment(i, 'text', v)} placeholder="Great product!" textarea />
                    </div>
                    <button onClick={() => removeComment(i)} className="mt-6 text-red-500 hover:text-red-700"><Trash2 size={16} /></button>
                  </div>
                ))}
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="font-semibold text-gray-700 mb-3">CTA Box</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="CTA Badge Text" value={data.social_proof?.cta_badge_text ?? ''} onChange={v => updateSpSection('cta_badge_text', v)} placeholder="Free Trial Available" />
                <Field label="CTA Button Text" value={data.social_proof?.cta_button_text ?? ''} onChange={v => updateSpSection('cta_button_text', v)} placeholder="Get Started Free" />
                <Field label="CTA Title" value={data.social_proof?.cta_title ?? ''} onChange={v => updateSpSection('cta_title', v)} placeholder="Start Your First AI Conversation" />
                <Field label="CTA Description" value={data.social_proof?.cta_description ?? ''} onChange={v => updateSpSection('cta_description', v)} placeholder="Experience intelligent AI avatars..." textarea />
              </div>
            </div>

            <div className="flex justify-end">
              <Button onClick={() => save('social_proof')} disabled={saving === 'social_proof'}>
                <Save size={14} className="mr-2" /> {saving === 'social_proof' ? 'Saving...' : 'Save Social Proof'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── STATS ── */}
      {activeTab === 'stats' && (
        <Card>
          <CardHeader>
            <CardTitle>Stats Bar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              {(data.stats ?? []).map((stat, i) => (
                <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                  <div className="flex-1 grid grid-cols-2 gap-3">
                    <Field label="Value" value={stat.value} onChange={v => updateStat(i, 'value', v)} placeholder="10,000+" />
                    <Field label="Label" value={stat.label} onChange={v => updateStat(i, 'label', v)} placeholder="Active Users" />
                  </div>
                  <button onClick={() => removeStat(i)} className="text-red-500 hover:text-red-700 mt-4"><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" onClick={addStat}><Plus size={14} className="mr-1" />Add Stat</Button>
            <div className="flex justify-end">
              <Button onClick={() => save('stats')} disabled={saving === 'stats'}>
                <Save size={14} className="mr-2" /> {saving === 'stats' ? 'Saving...' : 'Save Stats'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
