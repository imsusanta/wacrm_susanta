'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/db/client';
import { useAuth } from '@/hooks/use-auth';
import { useWorkspace } from '@/hooks/use-workspace';
import { getIndustryModule } from '@/modules/registry';
import { formatCurrency } from '@/lib/currency';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { formatWhatsAppDisplayPhone } from '@/core/whatsapp/group-identity';
import type {
  Contact,
  Tag,
  ContactNote,
  CustomField,
  Deal,
  Profile,
} from '@/types';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Phone,
  Mail,
  Building2,
  Copy,
  Check,
  Loader2,
  Plus,
  Trash2,
  Save,
  DollarSign,
  MessageSquare,
  FileUp,
  UserCheck,
  Clock,
  FileText,
  Sparkles,
  PhoneCall,
} from 'lucide-react';
import { SendOutboundModal } from '@/components/contacts/send-outbound-modal';
import { UploadPatientPdfModal } from '@/components/contacts/upload-patient-pdf-modal';
import { ContactActivityTimeline } from '@/components/contacts/contact-activity-timeline';
import { ContactTasksTab } from '@/components/contacts/contact-tasks-tab';
import { CallCustomerModal } from '@/components/calling/call-customer-modal';
import { getOrGeneratePatientId } from '@/lib/patients/id-generator';

interface ContactDetailViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contactId: string | null;
  onUpdated: () => void;
}

export function ContactDetailView({
  open,
  onOpenChange,
  contactId,
  onUpdated,
}: ContactDetailViewProps) {
  const router = useRouter();
  const appwrite = useMemo(() => createClient(), []);
  const { accountId, defaultCurrency, account } = useAuth();
  const { terminology, currentIndustry } = useWorkspace();
  const isHospital =
    currentIndustry === 'hospital_clinic' ||
    currentIndustry === 'hospital-clinic';

  const [activeTab, setActiveTab] = useState('timeline');
  const [contact, setContact] = useState<Contact | null>(null);
  const [patientSeqId, setPatientSeqId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [contactLoadError, setContactLoadError] = useState<string | null>(null);
  const [copiedPhone, setCopiedPhone] = useState(false);
  const [outboundOpen, setOutboundOpen] = useState(false);
  const [callCustomerModalOpen, setCallCustomerModalOpen] = useState(false);
  const [uploadPdfOpen, setUploadPdfOpen] = useState(false);

  // Details tab
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [editAssignedUserId, setEditAssignedUserId] = useState('');
  const [teamProfiles, setTeamProfiles] = useState<Profile[]>([]);
  const [editMetadata, setEditMetadata] = useState<Record<string, unknown>>({});
  const [savingDetails, setSavingDetails] = useState(false);

  // Tags tab
  const [allTags, setAllTags] = useState<Tag[]>([]);
  const [contactTagIds, setContactTagIds] = useState<string[]>([]);
  const [savingTags, setSavingTags] = useState(false);

  // Notes tab
  const [notes, setNotes] = useState<ContactNote[]>([]);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Custom fields tab
  const [customFields, setCustomFields] = useState<CustomField[]>([]);
  const [customValues, setCustomValues] = useState<Record<string, string>>({});
  const [savingCustom, setSavingCustom] = useState(false);
  const [loadingCustom, setLoadingCustom] = useState(false);

  // Deals tab
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loadingDeals, setLoadingDeals] = useState(false);

  const fetchContact = useCallback(async () => {
    if (!contactId) return;
    setLoading(true);
    setContact(null);
    setContactLoadError(null);

    try {
      const [contactRes, patientRes] = await Promise.all([
        appwrite.from('contacts').select('*').eq('id', contactId).single(),
        appwrite.from('patients').select('*').eq('id', contactId).maybeSingle(),
      ]);

      const data = contactRes?.data;
      let pData = patientRes?.data;

      if (!data) {
        setContactLoadError(
          `${terminology.person} could not be found or may have been deleted.`
        );
        return;
      }

      if (data) {
        // Auto-generate patient_seq_id if missing in patients table (Hospital & Clinic only)
        if (isHospital && !pData && accountId) {
          try {
            const { data: maxPatient } = await appwrite
              .from('patients')
              .select('patient_seq_id')
              .eq('account_id', accountId)
              .order('created_at', { ascending: false })
              .limit(1)
              .maybeSingle();

            let nextNum = 1;
            if (maxPatient?.patient_seq_id) {
              const numMatch = maxPatient.patient_seq_id.match(/\d+/);
              if (numMatch) {
                nextNum = parseInt(numMatch[0], 10) + 1;
              }
            }

            const generatedSeqId = `PAT-${String(nextNum).padStart(6, '0')}`;

            const { data: newP } = await appwrite
              .from('patients')
              .insert({
                id: contactId,
                account_id: accountId,
                patient_seq_id: generatedSeqId,
                status: 'active',
              })
              .select('*')
              .single();

            if (newP) {
              pData = newP;
            }

            await appwrite
              .from('contacts')
              .update({
                metadata: {
                  ...(data.metadata || {}),
                  patient_id: generatedSeqId,
                },
              })
              .eq('id', contactId);
          } catch (pErr) {
            console.warn(
              '[contact-detail-view] patient auto-provisioning exception:',
              pErr
            );
          }
        }

        setContact(data);
        setEditName(data.name ?? '');
        setEditPhone(data.phone ?? '');
        setEditEmail(data.email ?? '');
        setEditCompany(data.company ?? '');
        setEditAddress(data.address ?? '');
        setEditNotes(data.notes ?? '');
        setEditAssignedUserId(data.assigned_user_id ?? '');

        const seq = isHospital
          ? getOrGeneratePatientId(data, pData?.patient_seq_id)
          : '';
        setPatientSeqId(seq);

        const mergedMeta = {
          ...(data.metadata ?? {}),
          ...(seq ? { patient_id: seq } : {}),
          ...(pData?.blood_group ? { blood_group: pData.blood_group } : {}),
          ...(pData?.gender ? { gender: pData.gender } : {}),
          ...(pData?.date_of_birth ? { dob: pData.date_of_birth } : {}),
          ...(pData?.emergency_contact
            ? { emergency_contact: pData.emergency_contact }
            : {}),
        };

        setEditMetadata(mergedMeta);
      }
    } catch (err) {
      console.error('Failed to fetch contact details:', err);
      setContactLoadError(
        `Failed to load ${terminology.person.toLowerCase()} details.`
      );
    } finally {
      setLoading(false);
    }
  }, [contactId, accountId, appwrite, isHospital, terminology.person]);

  const fetchTags = useCallback(async () => {
    if (!contactId) return;

    const [tagsRes, contactTagsRes] = await Promise.all([
      appwrite.from('tags').select('*').order('name'),
      appwrite
        .from('contact_tags')
        .select('tag_id')
        .eq('contact_id', contactId),
    ]);

    if (tagsRes.data) setAllTags(tagsRes.data);
    if (contactTagsRes.data) {
      setContactTagIds(contactTagsRes.data.map((ct) => ct.tag_id));
    }
  }, [contactId, appwrite]);

  const fetchNotes = useCallback(async () => {
    if (!contactId) return;
    setLoadingNotes(true);

    const { data } = await appwrite
      .from('contact_notes')
      .select('*')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });

    if (data) setNotes(data);
    setLoadingNotes(false);
  }, [contactId, appwrite]);

  const fetchCustomFields = useCallback(async () => {
    if (!contactId) return;
    setLoadingCustom(true);

    const [fieldsRes, valuesRes] = await Promise.all([
      appwrite.from('custom_fields').select('*').order('field_name'),
      appwrite
        .from('contact_custom_values')
        .select('*')
        .eq('contact_id', contactId),
    ]);

    if (fieldsRes.data) setCustomFields(fieldsRes.data);
    if (valuesRes.data) {
      const map: Record<string, string> = {};
      valuesRes.data.forEach((v) => {
        map[v.custom_field_id] = v.value ?? '';
      });
      setCustomValues(map);
    }
    setLoadingCustom(false);
  }, [contactId, appwrite]);

  const fetchDeals = useCallback(async () => {
    if (!contactId) return;
    setLoadingDeals(true);
    const { data } = await appwrite
      .from('deals')
      .select('*, stage:pipeline_stages(*)')
      .eq('contact_id', contactId)
      .order('created_at', { ascending: false });
    setDeals((data ?? []) as Deal[]);
    setLoadingDeals(false);
  }, [contactId, appwrite]);

  useEffect(() => {
    if (open && contactId) {
      fetchContact();
      fetchTags();
      fetchNotes();
      fetchCustomFields();
      fetchDeals();

      // Fetch team members for assignment
      appwrite
        .from('profiles')
        .select('*')
        .order('full_name')
        .then(
          (res) => {
            if (res.data) setTeamProfiles(res.data);
          },
          () => undefined
        );
    }
  }, [
    open,
    contactId,
    fetchContact,
    fetchTags,
    fetchNotes,
    fetchCustomFields,
    fetchDeals,
    appwrite,
  ]);

  async function copyPhone() {
    if (!contact) return;
    await navigator.clipboard.writeText(
      formatWhatsAppDisplayPhone(contact.phone) || contact.phone
    );
    setCopiedPhone(true);
    setTimeout(() => setCopiedPhone(false), 2000);
  }

  async function saveDetails() {
    if (!contactId || !editPhone.trim()) {
      toast.error('Phone number is required');
      return;
    }

    // Validate required custom fields
    const industryModule = getIndustryModule(account?.industry);
    const contactConfig = industryModule.entityConfigs?.contacts;
    const customFields = contactConfig?.fields || [];
    for (const field of customFields) {
      if (field.required && !editMetadata[field.key]) {
        toast.error(`${field.label} is required`);
        return;
      }
    }

    setSavingDetails(true);

    if (isHospital && patientSeqId && contactId && accountId) {
      await appwrite.from('patients').upsert({
        id: contactId,
        account_id: accountId,
        patient_seq_id: patientSeqId,
        blood_group: editMetadata.blood_group || null,
        gender: editMetadata.gender || null,
        date_of_birth: editMetadata.dob || null,
        emergency_contact: editMetadata.emergency_contact || null,
        updated_at: new Date().toISOString(),
      });
    }

    const { error } = await appwrite
      .from('contacts')
      .update({
        name: editName.trim() || null,
        phone: editPhone.trim(),
        email: editEmail.trim() || null,
        company: editCompany.trim() || null,
        address: editAddress.trim() || null,
        notes: editNotes.trim() || null,
        assigned_user_id: editAssignedUserId || null,
        metadata: {
          ...editMetadata,
          ...(isHospital && patientSeqId ? { patient_id: patientSeqId } : {}),
        },
        updated_at: new Date().toISOString(),
      })
      .eq('id', contactId);

    if (error) {
      toast.error('Failed to update contact');
    } else {
      toast.success('Contact updated');
      fetchContact();
      onUpdated();
    }
    setSavingDetails(false);
  }

  async function toggleTag(tagId: string) {
    if (!contactId) return;
    setSavingTags(true);

    const isSelected = contactTagIds.includes(tagId);

    if (isSelected) {
      const { error } = await appwrite
        .from('contact_tags')
        .delete()
        .eq('contact_id', contactId)
        .eq('tag_id', tagId);
      if (!error) {
        setContactTagIds((prev) => prev.filter((id) => id !== tagId));
        onUpdated();
      }
    } else {
      const { error } = await appwrite
        .from('contact_tags')
        .insert({ contact_id: contactId, tag_id: tagId });
      if (!error) {
        setContactTagIds((prev) => [...prev, tagId]);
        onUpdated();
      }
    }
    setSavingTags(false);
  }

  async function addNote() {
    if (!contactId || !newNote.trim()) return;
    setSavingNote(true);

    const {
      data: { session },
    } = await appwrite.auth.getSession();
    const user = session?.user;
    if (!user || !accountId) {
      toast.error('Not authenticated');
      setSavingNote(false);
      return;
    }

    const { error } = await appwrite.from('contact_notes').insert({
      contact_id: contactId,
      account_id: accountId,
      user_id: user.id,
      note_text: newNote.trim(),
    });

    if (error) {
      toast.error('Failed to add note');
    } else {
      setNewNote('');
      fetchNotes();
      toast.success('Note added');
    }
    setSavingNote(false);
  }

  async function deleteNote(noteId: string) {
    const { error } = await appwrite
      .from('contact_notes')
      .delete()
      .eq('id', noteId);

    if (error) {
      toast.error('Failed to delete note');
    } else {
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      toast.success('Note deleted');
    }
  }

  async function saveCustomFields() {
    if (!contactId) return;
    setSavingCustom(true);

    try {
      // Delete existing values and re-insert
      await appwrite
        .from('contact_custom_values')
        .delete()
        .eq('contact_id', contactId);

      const rows = Object.entries(customValues)
        .filter(([, val]) => val.trim())
        .map(([fieldId, val]) => ({
          contact_id: contactId,
          custom_field_id: fieldId,
          value: val.trim(),
        }));

      if (rows.length > 0) {
        const { error } = await appwrite
          .from('contact_custom_values')
          .insert(rows);
        if (error) throw error;
      }

      toast.success('Custom fields saved');
    } catch {
      toast.error('Failed to save custom fields');
    }
    setSavingCustom(false);
  }

  function getInitials(name?: string | null) {
    if (!name) return '?';
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="bg-popover border-border text-popover-foreground w-full p-0 sm:max-w-lg"
      >
        {loading ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="text-primary size-6 animate-spin" />
          </div>
        ) : contactLoadError || !contact ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
            <p className="text-foreground text-sm font-semibold">
              {contactLoadError || `${terminology.person} is unavailable.`}
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchContact}>
                Retry
              </Button>
              <Button size="sm" onClick={() => onOpenChange(false)}>
                Close
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col">
            {/* Header */}
            <SheetHeader className="border-border/50 border-b p-4">
              <div className="flex items-center gap-3">
                <Avatar className="bg-muted border-border size-12 border">
                  <AvatarFallback className="bg-primary/10 text-primary text-sm font-medium">
                    {getInitials(contact.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <SheetTitle className="text-popover-foreground truncate">
                      {contact.name || 'Unknown'}
                    </SheetTitle>
                    {patientSeqId && (
                      <span className="inline-flex shrink-0 items-center rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {patientSeqId}
                      </span>
                    )}
                  </div>
                  <SheetDescription className="text-muted-foreground mt-0.5 text-xs">
                    {terminology.person} Profile 360°
                  </SheetDescription>
                  <div className="text-muted-foreground mt-1.5 flex flex-wrap items-center gap-3 text-xs">
                    <button
                      onClick={copyPhone}
                      className="hover:text-primary flex cursor-pointer items-center gap-1 transition-colors"
                    >
                      <Phone className="size-3" />
                      {formatWhatsAppDisplayPhone(contact.phone) ||
                        contact.phone}
                      {copiedPhone ? (
                        <Check className="text-primary size-3" />
                      ) : (
                        <Copy className="size-3" />
                      )}
                    </button>
                    {contact.email && (
                      <span className="flex items-center gap-1">
                        <Mail className="size-3" />
                        {contact.email}
                      </span>
                    )}
                    {contact.company && (
                      <span className="flex items-center gap-1">
                        <Building2 className="size-3" />
                        {contact.company}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      onOpenChange(false);
                      router.push(`/inbox?contactId=${contact.id}`);
                    }}
                    className="cursor-pointer gap-1 border-emerald-500/40 bg-emerald-500/10 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-400"
                    title="Open Conversation in Inbox"
                  >
                    <MessageSquare className="size-3.5" />
                    WhatsApp
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setCallCustomerModalOpen(true)}
                    className="cursor-pointer gap-1 border-blue-500/40 bg-blue-500/10 text-xs font-semibold text-blue-600 hover:bg-blue-500/20 dark:text-blue-400"
                    title="Call Customer with AI Voice Agent"
                  >
                    <PhoneCall className="size-3.5" />
                    Call
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('tasks')}
                    className="border-primary/40 bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer gap-1 text-xs font-semibold"
                  >
                    <Clock className="size-3.5" />
                    Add Task
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setActiveTab('notes')}
                    className="cursor-pointer gap-1 border-amber-500/40 bg-amber-500/10 text-xs font-semibold text-amber-600 hover:bg-amber-500/20"
                  >
                    <FileText className="size-3.5" />
                    Add Note
                  </Button>
                  {patientSeqId && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setUploadPdfOpen(true)}
                      className="border-muted-foreground/30 hover:bg-muted cursor-pointer gap-1 text-xs font-semibold"
                    >
                      <FileUp className="size-3.5" />
                      PDF
                    </Button>
                  )}
                </div>
              </div>
            </SheetHeader>

            {/* Tabs */}
            <Tabs
              value={activeTab}
              onValueChange={setActiveTab}
              className="flex min-h-0 flex-1 flex-col"
            >
              <TabsList className="bg-muted/50 border-border mx-4 mt-3 h-auto flex-wrap gap-1 border-b">
                <TabsTrigger
                  value="timeline"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground text-xs"
                >
                  Timeline
                </TabsTrigger>
                <TabsTrigger
                  value="tasks"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground text-xs"
                >
                  Tasks
                </TabsTrigger>
                <TabsTrigger
                  value="details"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground text-xs"
                >
                  Details
                </TabsTrigger>
                <TabsTrigger
                  value="tags"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground text-xs"
                >
                  Tags
                </TabsTrigger>
                <TabsTrigger
                  value="notes"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground text-xs"
                >
                  Notes
                </TabsTrigger>
                <TabsTrigger
                  value="custom"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground text-xs"
                >
                  Custom Fields
                </TabsTrigger>
                <TabsTrigger
                  value="deals"
                  className="data-active:bg-muted data-active:text-primary text-muted-foreground text-xs"
                >
                  {terminology.pipelineItems}
                </TabsTrigger>
              </TabsList>

              {/* Timeline Tab */}
              <TabsContent
                value="timeline"
                className="flex-1 overflow-hidden p-0"
              >
                <ContactActivityTimeline contactId={contact.id} />
              </TabsContent>

              {/* Tasks Tab */}
              <TabsContent value="tasks" className="flex-1 overflow-hidden p-0">
                <ContactTasksTab
                  contactId={contact.id}
                  contactName={contact.name}
                />
              </TabsContent>

              {/* Details Tab */}
              <TabsContent
                value="details"
                className="flex-1 overflow-y-auto px-4 py-3"
              >
                <div className="space-y-3 pb-4">
                  {/* AI Summary Banner (if AI metadata exists) */}
                  {Boolean(
                    editMetadata.ai_summary ||
                    editMetadata.ai_intent ||
                    editMetadata.ai_lead_score ||
                    editMetadata.ai_recommended_action
                  ) && (
                    <div className="border-primary/20 bg-primary/5 space-y-1.5 rounded-lg border p-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-primary flex items-center gap-1.5 text-xs font-bold">
                          <Sparkles className="size-3.5" />
                          AI Summary
                        </span>
                        {Boolean(editMetadata.ai_lead_score) && (
                          <Badge
                            variant="outline"
                            className="border-primary/30 text-primary text-[10px] font-bold"
                          >
                            {Number(editMetadata.ai_lead_score) >= 70 ||
                            String(editMetadata.ai_lead_score).toLowerCase() ===
                              'hot'
                              ? '🔥 Hot'
                              : Number(editMetadata.ai_lead_score) >= 40 ||
                                  String(
                                    editMetadata.ai_lead_score
                                  ).toLowerCase() === 'warm'
                                ? '🟡 Warm'
                                : '🔵 Cold'}
                          </Badge>
                        )}
                      </div>
                      {Boolean(editMetadata.ai_summary) && (
                        <p className="text-foreground/90 text-xs leading-relaxed font-medium">
                          {String(editMetadata.ai_summary)}
                        </p>
                      )}
                      {Boolean(editMetadata.ai_intent) && (
                        <p className="text-muted-foreground text-[11px]">
                          Intent:{' '}
                          <span className="text-foreground font-semibold">
                            {String(editMetadata.ai_intent)}
                          </span>
                        </p>
                      )}
                      {Boolean(editMetadata.ai_recommended_action) && (
                        <p className="text-primary/90 text-[11px] font-semibold">
                          Recommended next action:{' '}
                          {String(editMetadata.ai_recommended_action)}
                        </p>
                      )}
                    </div>
                  )}

                  {/* Permanent primary-record ID field */}
                  <div className="space-y-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-2.5">
                    <Label className="flex items-center justify-between text-xs font-bold text-emerald-700 dark:text-emerald-300">
                      <span>Unique {terminology.person} ID (Permanent)</span>
                      <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                        Auto-Generated & Permanent
                      </span>
                    </Label>
                    <div className="flex items-center gap-2">
                      <Input
                        value={
                          patientSeqId ||
                          (editMetadata.patient_id as string) ||
                          'PAT-000001'
                        }
                        readOnly
                        className="h-8 cursor-not-allowed border-emerald-500/30 bg-emerald-500/10 font-mono text-sm font-bold text-emerald-700 dark:text-emerald-300"
                      />
                      <Badge
                        variant="outline"
                        className="shrink-0 border-emerald-500/30 bg-emerald-500/10 font-mono text-[10px] text-emerald-600 dark:text-emerald-400"
                      >
                        Unique
                      </Badge>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Full Name
                    </Label>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Mobile Number <span className="text-red-400">*</span>
                    </Label>
                    <Input
                      value={editPhone}
                      onChange={(e) => setEditPhone(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Email
                    </Label>
                    <Input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Company
                    </Label>
                    <Input
                      value={editCompany}
                      onChange={(e) => setEditCompany(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Address
                    </Label>
                    <Input
                      value={editAddress}
                      onChange={(e) => setEditAddress(e.target.value)}
                      className="bg-muted border-border text-foreground h-8 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground flex items-center gap-1.5 text-xs">
                      <UserCheck className="text-primary size-3.5" />
                      Assigned Team Member
                    </Label>
                    <select
                      value={editAssignedUserId}
                      onChange={(e) => setEditAssignedUserId(e.target.value)}
                      className="bg-muted border-border text-foreground focus:ring-primary h-8 w-full rounded-md px-2 text-xs focus:ring-1"
                    >
                      <option value="">Unassigned</option>
                      {teamProfiles.map((p) => (
                        <option
                          key={p.id || p.user_id}
                          value={p.id || p.user_id}
                        >
                          {p.full_name || p.email} ({p.role || 'Member'})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Industry Dynamic Custom Fields */}
                  {(() => {
                    const industryModule = getIndustryModule(account?.industry);
                    const contactConfig =
                      industryModule.entityConfigs?.contacts;
                    const fields = contactConfig?.fields || [];
                    if (fields.length === 0) return null;

                    return (
                      <div className="border-border/50 space-y-3 border-t pt-2">
                        <span className="text-primary block text-[10px] font-bold uppercase">
                          {terminology.person} Details
                        </span>
                        {fields.map((field) => {
                          const val =
                            (editMetadata[field.key] as string | number) ?? '';
                          const handleChange = (newVal: unknown) => {
                            setEditMetadata((prev) => ({
                              ...prev,
                              [field.key]: newVal,
                            }));
                          };

                          return (
                            <div key={field.key} className="space-y-1.5">
                              <Label className="text-muted-foreground text-xs">
                                {field.label}{' '}
                                {field.required && (
                                  <span className="text-red-400">*</span>
                                )}
                              </Label>
                              {field.type === 'select' ? (
                                <select
                                  value={val}
                                  onChange={(e) => handleChange(e.target.value)}
                                  className="border-border bg-muted text-foreground focus-visible:ring-ring flex h-8 w-full rounded-md border px-3 py-1 text-sm shadow-sm transition-colors focus-visible:ring-1 focus-visible:outline-none"
                                >
                                  <option value="">Select option...</option>
                                  {field.options?.map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : field.type === 'number' ? (
                                <Input
                                  type="number"
                                  value={val}
                                  onChange={(e) => handleChange(e.target.value)}
                                  className="bg-muted border-border text-foreground h-8 text-sm"
                                />
                              ) : field.type === 'date' ? (
                                <Input
                                  type="date"
                                  value={val}
                                  onChange={(e) => handleChange(e.target.value)}
                                  className="bg-muted border-border text-foreground h-8 text-sm"
                                />
                              ) : (
                                <Input
                                  value={val}
                                  onChange={(e) => handleChange(e.target.value)}
                                  className="bg-muted border-border text-foreground h-8 text-sm"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    );
                  })()}

                  <div className="space-y-1.5">
                    <Label className="text-muted-foreground text-xs">
                      Notes
                    </Label>
                    <Textarea
                      value={editNotes}
                      onChange={(e) => setEditNotes(e.target.value)}
                      placeholder="Enter private notes..."
                      className="bg-muted border-border text-foreground min-h-[60px] resize-none text-sm"
                    />
                  </div>

                  <Button
                    onClick={saveDetails}
                    disabled={savingDetails}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground mt-2 w-full"
                    size="sm"
                  >
                    {savingDetails ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Save className="size-3.5" />
                    )}
                    Save Changes
                  </Button>
                </div>
              </TabsContent>

              {/* Tags Tab */}
              <TabsContent
                value="tags"
                className="flex-1 overflow-y-auto px-4 py-3"
              >
                <div className="space-y-3">
                  <p className="text-muted-foreground text-xs">
                    Click a tag to add or remove it from this contact.
                  </p>
                  {allTags.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No tags available. Create tags in Settings.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {allTags.map((tag) => {
                        const selected = contactTagIds.includes(tag.id);
                        return (
                          <button
                            key={tag.id}
                            onClick={() => toggleTag(tag.id)}
                            disabled={savingTags}
                            className={`inline-flex cursor-pointer items-center rounded-full px-3 py-1 text-xs font-medium transition-all ${
                              selected
                                ? 'ring-primary ring-offset-border ring-2 ring-offset-1'
                                : 'opacity-50 hover:opacity-80'
                            }`}
                            style={{
                              backgroundColor: tag.color + '20',
                              color: tag.color,
                            }}
                          >
                            {selected && <Check className="mr-1 size-3" />}
                            {tag.name}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Notes Tab */}
              <TabsContent
                value="notes"
                className="flex min-h-0 flex-1 flex-col px-4 py-3"
              >
                <div className="mb-3 space-y-2">
                  <Textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    placeholder="Write a note..."
                    className="bg-muted border-border text-foreground placeholder:text-muted-foreground min-h-[60px] resize-none text-sm"
                  />
                  <Button
                    onClick={addNote}
                    disabled={!newNote.trim() || savingNote}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    size="sm"
                  >
                    {savingNote ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Plus className="size-3.5" />
                    )}
                    Add Note
                  </Button>
                </div>

                <div className="flex-1 space-y-2 overflow-y-auto">
                  {loadingNotes ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="text-muted-foreground size-5 animate-spin" />
                    </div>
                  ) : notes.length === 0 ? (
                    <p className="text-muted-foreground py-8 text-center text-sm">
                      No notes yet.
                    </p>
                  ) : (
                    notes.map((note) => (
                      <div
                        key={note.id}
                        className="bg-muted/50 border-border/50 group rounded-lg border p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-muted-foreground flex-1 text-sm whitespace-pre-wrap">
                            {note.note_text}
                          </p>
                          <button
                            onClick={() => deleteNote(note.id)}
                            className="text-muted-foreground shrink-0 cursor-pointer opacity-0 transition-all group-hover:opacity-100 hover:text-red-400"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                        <p className="text-muted-foreground mt-1.5 text-xs">
                          {new Date(note.created_at).toLocaleDateString(
                            'en-US',
                            {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            }
                          )}
                        </p>
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Custom Fields Tab */}
              <TabsContent
                value="custom"
                className="flex-1 overflow-y-auto px-4 py-3"
              >
                {loadingCustom ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-muted-foreground size-5 animate-spin" />
                  </div>
                ) : customFields.length === 0 ? (
                  <p className="text-muted-foreground py-8 text-center text-sm">
                    No custom fields defined. Create them in Settings.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {customFields.map((field) => (
                      <div key={field.id} className="space-y-1.5">
                        <Label className="text-muted-foreground text-xs capitalize">
                          {field.field_name}
                        </Label>
                        <Input
                          value={customValues[field.id] ?? ''}
                          onChange={(e) =>
                            setCustomValues((prev) => ({
                              ...prev,
                              [field.id]: e.target.value,
                            }))
                          }
                          placeholder={`Enter ${field.field_name}...`}
                          className="bg-muted border-border text-foreground placeholder:text-muted-foreground h-8 text-sm"
                        />
                      </div>
                    ))}
                    <Button
                      onClick={saveCustomFields}
                      disabled={savingCustom}
                      className="bg-primary hover:bg-primary/90 text-primary-foreground w-full"
                      size="sm"
                    >
                      {savingCustom ? (
                        <Loader2 className="size-3.5 animate-spin" />
                      ) : (
                        <Save className="size-3.5" />
                      )}
                      Save Custom Fields
                    </Button>
                  </div>
                )}
              </TabsContent>

              {/* Deals Tab */}
              <TabsContent
                value="deals"
                className="flex-1 overflow-y-auto px-4 py-3"
              >
                {loadingDeals ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="text-primary size-5 animate-spin" />
                  </div>
                ) : deals.length === 0 ? (
                  <p className="text-muted-foreground text-xs">No deals yet</p>
                ) : (
                  <div className="space-y-2">
                    {deals.map((deal) => (
                      <div
                        key={deal.id}
                        className="border-border bg-muted/50 rounded-lg border p-3"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-foreground text-sm font-medium">
                            {deal.title}
                          </p>
                          {deal.stage && (
                            <span
                              className="shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                              style={{
                                backgroundColor: `${deal.stage.color}20`,
                                color: deal.stage.color,
                              }}
                            >
                              {deal.stage.name}
                            </span>
                          )}
                        </div>
                        <div className="text-muted-foreground mt-1.5 flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1">
                            <DollarSign className="size-3" />
                            {formatCurrency(
                              deal.value ?? 0,
                              deal.currency || defaultCurrency
                            )}
                          </span>
                          {deal.status && deal.status !== 'open' && (
                            <span
                              className={
                                deal.status === 'won'
                                  ? 'text-primary'
                                  : 'text-red-400'
                              }
                            >
                              {deal.status}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </div>
        )}
      </SheetContent>
      <SendOutboundModal
        open={outboundOpen}
        onOpenChange={setOutboundOpen}
        defaultContact={contact}
      />
      {contact && (
        <UploadPatientPdfModal
          open={uploadPdfOpen}
          onOpenChange={setUploadPdfOpen}
          patientId={patientSeqId || 'PAT-000000'}
          contactId={contact.id}
          patientName={contact.name || terminology.person}
          patientPhone={contact.phone}
          onSuccess={() => {}}
        />
      )}
      <CallCustomerModal
        open={callCustomerModalOpen}
        onOpenChange={setCallCustomerModalOpen}
        contactId={contact?.id}
        initialName={contact?.name || ''}
        initialPhone={contact?.phone || ''}
        onCallInitiated={() => {
          onUpdated();
        }}
      />
    </Sheet>
  );
}
