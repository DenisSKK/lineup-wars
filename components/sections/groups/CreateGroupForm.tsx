"use client";

import { motion } from "framer-motion";
import { Plus } from "lucide-react";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription,
  Button, 
  Input, 
  Textarea
} from "@/components/ui";

interface CreateGroupFormProps {
  newGroupName: string;
  setNewGroupName: (name: string) => void;
  newGroupDescription: string;
  setNewGroupDescription: (description: string) => void;
  isCreating: boolean;
  onSubmit: (e: React.FormEvent) => Promise<void>;
}

export function CreateGroupForm({
  newGroupName,
  setNewGroupName,
  newGroupDescription,
  setNewGroupDescription,
  isCreating,
  onSubmit,
}: CreateGroupFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      whileInView={{ opacity: 1, x: 0 }}
      viewport={{ once: true }}
    >
      <Card variant="gradient" padding="lg" className="sticky top-24">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-[var(--accent-primary)]" />
            Create New Group
          </CardTitle>
          <CardDescription>
            Start a new group to compare ratings
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <Input
              label="Group Name"
              placeholder="Enter group name..."
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              required
            />
            <Textarea
              label="Description (optional)"
              placeholder="What's this group about?"
              value={newGroupDescription}
              onChange={(e) => setNewGroupDescription(e.target.value)}
              rows={3}
            />
            <Button
              type="submit"
              className="w-full"
              isLoading={isCreating}
              disabled={!newGroupName.trim()}
            >
              Create Group
            </Button>
          </form>
        </CardContent>
      </Card>
    </motion.div>
  );
}
