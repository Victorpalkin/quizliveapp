'use client';

import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  FileText,
  Users,
  GraduationCap,
  MessageSquare,
  Calendar,
  Sparkles,
  Plus,
  BarChart3,
  Cloud,
  FileQuestion,
} from 'lucide-react';
import { PresentationTemplate, PresentationTemplateCategory, PresentationSlide } from '@/lib/types';
import { BUILTIN_TEMPLATES, cloneTemplateSlides } from '@/lib/presentation-templates';

interface TemplateSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (slides: PresentationSlide[], templateName?: string) => void;
  userTemplates?: PresentationTemplate[];
}

const CATEGORY_CONFIG: Record<
  PresentationTemplateCategory,
  { label: string; icon: React.ReactNode; color: string }
> = {
  workshop: {
    label: 'Workshop',
    icon: <Users className="h-4 w-4" />,
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
  },
  training: {
    label: 'Training',
    icon: <GraduationCap className="h-4 w-4" />,
    color: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  },
  feedback: {
    label: 'Feedback',
    icon: <MessageSquare className="h-4 w-4" />,
    color: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
  },
  meeting: {
    label: 'Meeting',
    icon: <Calendar className="h-4 w-4" />,
    color: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-300',
  },
  custom: {
    label: 'Custom',
    icon: <Sparkles className="h-4 w-4" />,
    color: 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-300',
  },
};

/**
 * Get icon for slide type
 */
function getSlideTypeIcon(type: string): React.ReactNode {
  switch (type) {
    case 'content':
      return <FileText className="h-3 w-3" />;
    case 'quiz':
      return <FileQuestion className="h-3 w-3" />;
    case 'poll':
      return <BarChart3 className="h-3 w-3" />;
    case 'thoughts-collect':
    case 'thoughts-results':
      return <Cloud className="h-3 w-3" />;
    case 'rating-describe':
    case 'rating-input':
    case 'rating-results':
      return <BarChart3 className="h-3 w-3" />;
    case 'leaderboard':
      return <Users className="h-3 w-3" />;
    default:
      return <FileText className="h-3 w-3" />;
  }
}

/**
 * Template card component
 */
function TemplateCard({
  template,
  onSelect,
}: {
  template: PresentationTemplate;
  onSelect: () => void;
}) {
  const categoryConfig = CATEGORY_CONFIG[template.category];

  // Count slide types
  const slideTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    template.slides.forEach((slide) => {
      counts[slide.type] = (counts[slide.type] || 0) + 1;
    });
    return counts;
  }, [template.slides]);

  return (
    <Card
      className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all"
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-base">{template.name}</CardTitle>
          <Badge variant="secondary" className={categoryConfig.color}>
            {categoryConfig.icon}
            <span className="ml-1">{categoryConfig.label}</span>
          </Badge>
        </div>
        <CardDescription className="text-sm">{template.description}</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-1">
          {Object.entries(slideTypeCounts).map(([type, count]) => (
            <Badge
              key={type}
              variant="outline"
              className="text-xs font-normal"
            >
              {getSlideTypeIcon(type)}
              <span className="ml-1">
                {count} {type.replace('-', ' ')}
              </span>
            </Badge>
          ))}
        </div>
        <div className="mt-3 text-xs text-muted-foreground">
          {template.slides.length} slides
        </div>
      </CardContent>
    </Card>
  );
}

export function TemplateSelector({
  open,
  onOpenChange,
  onSelectTemplate,
  userTemplates = [],
}: TemplateSelectorProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Filter templates by category
  const filteredBuiltInTemplates = useMemo(() => {
    if (selectedCategory === 'all') {
      return BUILTIN_TEMPLATES;
    }
    return BUILTIN_TEMPLATES.filter((t) => t.category === selectedCategory);
  }, [selectedCategory]);

  const filteredUserTemplates = useMemo(() => {
    if (selectedCategory === 'all') {
      return userTemplates;
    }
    return userTemplates.filter((t) => t.category === selectedCategory);
  }, [selectedCategory, userTemplates]);

  // Handle template selection
  const handleSelectTemplate = (template: PresentationTemplate) => {
    // Clone slides with new IDs
    const clonedSlides = cloneTemplateSlides(template.slides);
    onSelectTemplate(clonedSlides, template.name);
    onOpenChange(false);
  };

  // Handle blank presentation
  const handleStartBlank = () => {
    onSelectTemplate([], undefined);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Choose a Template</DialogTitle>
          <DialogDescription>
            Start with a pre-built template or create from scratch
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={selectedCategory}
          onValueChange={setSelectedCategory}
          className="flex-1 overflow-hidden flex flex-col"
        >
          <TabsList className="grid grid-cols-6 w-full">
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="workshop">Workshop</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="feedback">Feedback</TabsTrigger>
            <TabsTrigger value="meeting">Meeting</TabsTrigger>
            {userTemplates.length > 0 && (
              <TabsTrigger value="custom">My Templates</TabsTrigger>
            )}
          </TabsList>

          <div className="flex-1 overflow-y-auto mt-4 pr-2">
            {/* Start from scratch option */}
            <Card
              className="cursor-pointer hover:border-primary/50 hover:shadow-md transition-all mb-4 border-dashed"
              onClick={handleStartBlank}
            >
              <CardContent className="flex items-center gap-3 py-4">
                <div className="p-2 rounded-full bg-muted">
                  <Plus className="h-5 w-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="font-medium">Start from scratch</p>
                  <p className="text-sm text-muted-foreground">
                    Create a blank presentation and add your own slides
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Built-in templates */}
            {filteredBuiltInTemplates.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-muted-foreground">Built-in Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredBuiltInTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* User templates */}
            {filteredUserTemplates.length > 0 && (
              <div className="space-y-3 mt-6">
                <h4 className="text-sm font-medium text-muted-foreground">My Templates</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredUserTemplates.map((template) => (
                    <TemplateCard
                      key={template.id}
                      template={template}
                      onSelect={() => handleSelectTemplate(template)}
                    />
                  ))}
                </div>
              </div>
            )}

            {filteredBuiltInTemplates.length === 0 && filteredUserTemplates.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                <p>No templates found in this category</p>
              </div>
            )}
          </div>
        </Tabs>

        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
