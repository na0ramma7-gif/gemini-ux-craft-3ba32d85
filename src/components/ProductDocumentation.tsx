import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Product, Document, DocumentType, DocumentTag } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  FileText, Plus, Search, Trash2, Eye, Download, Pencil,
  FolderOpen, X,
} from 'lucide-react';
import { formatDate, cn } from '@/lib/utils';
import { z } from 'zod';
import { toast } from 'sonner';
import { nameField, longText, optionalText, personField, dateField } from '@/lib/validation';

interface Props {
  product: Product;
}

const DOCUMENT_TYPES: DocumentType[] = [
  'BRD', 'PRD', 'Technical Design', 'Architecture', 'Test Cases',
  'UAT Evidence', 'Release Notes', 'API Documentation', 'User Manual',
  'Operational Runbook', 'Risk / Compliance', 'Other',
];

const DOCUMENT_TAGS: DocumentTag[] = ['Business', 'Technical', 'Testing', 'Compliance', 'Operations'];

const TAG_COLORS: Record<DocumentTag, string> = {
  Business: 'bg-primary/10 text-primary',
  Technical: 'bg-accent/10 text-accent',
  Testing: 'bg-warning/10 text-warning',
  Compliance: 'bg-destructive/10 text-destructive',
  Operations: 'bg-success/10 text-success',
};

const TYPE_COLORS: Record<string, string> = {
  BRD: 'bg-primary/10 text-primary',
  PRD: 'bg-accent/10 text-accent',
  'Technical Design': 'bg-muted text-foreground',
  Architecture: 'bg-warning/10 text-warning',
  'Release Notes': 'bg-success/10 text-success',
  'Test Cases': 'bg-destructive/10 text-destructive',
  Other: 'bg-secondary text-muted-foreground',
};

const uid = () => Math.floor(Math.random() * 100000);

const docSchema = z.object({
  title: nameField('Title', { min: 2, max: 120 }),
  type: z.string().min(1, 'Document type is required'),
  description: longText('Description', 1000),
  version: optionalText('Version', 20),
  effectiveDate: dateField('Effective Date', false),
  owner: personField('Owner', false),
  fileName: z.string().min(1, 'A file must be selected'),
});

const ProductDocumentation = ({ product }: Props) => {
  const { state, setState, t, language } = useApp();
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<DocumentType | 'all'>('all');

  // Upload form state
  const [formType, setFormType] = useState<DocumentType>('PRD');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVersion, setFormVersion] = useState('');
  const [formEffectiveDate, setFormEffectiveDate] = useState('');
  const [formOwner, setFormOwner] = useState('');
  const [formTags, setFormTags] = useState<DocumentTag[]>([]);
  const [formFileName, setFormFileName] = useState('');
  const [formFileSize, setFormFileSize] = useState(0);

  const documents = useMemo(() =>
    state.documents.filter(d => d.entityType === 'product' && d.entityId === product.id),
    [state.documents, product.id]
  );

  const filteredDocs = useMemo(() => {
    let docs = documents;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      docs = docs.filter(d => d.title.toLowerCase().includes(q) || d.name.toLowerCase().includes(q));
    }
    if (filterType !== 'all') docs = docs.filter(d => d.type === filterType);
    return docs;
  }, [documents, searchQuery, filterType]);

  const resetForm = () => {
    setFormType('PRD');
    setFormTitle('');
    setFormDescription('');
    setFormVersion('');
    setFormEffectiveDate('');
    setFormOwner('');
    setFormTags([]);
    setFormFileName('');
    setFormFileSize(0);
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormFileName(file.name);
      setFormFileSize(file.size);
      if (!formTitle) setFormTitle(file.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUpload = () => {
    const result = docSchema.safeParse({
      title: formTitle, type: formType, description: formDescription,
      version: formVersion, effectiveDate: formEffectiveDate, owner: formOwner,
      fileName: formFileName,
    });
    if (!result.success) {
      const first = result.error.issues[0];
      toast.error(first?.message || 'Please correct the highlighted fields');
      return;
    }
    const newDoc: Document = {
      id: uid(),
      title: formTitle,
      name: formFileName,
      type: formType,
      level: 'product',
      size: formFileSize,
      uploadedBy: formOwner || 'Current User',
      uploadedAt: new Date().toISOString().split('T')[0],
      entityType: 'product',
      entityId: product.id,
      description: formDescription || undefined,
      version: formVersion || undefined,
      effectiveDate: formEffectiveDate || undefined,
      tags: formTags.length > 0 ? formTags : undefined,
    };
    setState(prev => ({ ...prev, documents: [...prev.documents, newDoc] }));
    toast.success(`Document "${formTitle}" uploaded`);
    setShowUploadModal(false);
    resetForm();
  };

  const handleDelete = (docId: number) => {
    setState(prev => ({ ...prev, documents: prev.documents.filter(d => d.id !== docId) }));
  };

  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    setFormTitle(doc.title);
    setFormType(doc.type);
    setFormDescription(doc.description || '');
    setFormVersion(doc.version || '');
    setFormEffectiveDate(doc.effectiveDate || '');
    setFormOwner(doc.uploadedBy);
    setFormTags(doc.tags || []);
    setShowEditModal(true);
  };

  const handleEditSave = () => {
    if (!editingDoc) return;
    const result = docSchema.safeParse({
      title: formTitle, type: formType, description: formDescription,
      version: formVersion, effectiveDate: formEffectiveDate, owner: formOwner,
      fileName: editingDoc.name,
    });
    if (!result.success) {
      const first = result.error.issues[0];
      toast.error(first?.message || 'Please correct the highlighted fields');
      return;
    }
    setState(prev => ({
      ...prev,
      documents: prev.documents.map(d =>
        d.id === editingDoc.id
          ? {
              ...d,
              title: formTitle,
              type: formType,
              description: formDescription || undefined,
              version: formVersion || undefined,
              effectiveDate: formEffectiveDate || undefined,
              uploadedBy: formOwner || d.uploadedBy,
              tags: formTags.length > 0 ? formTags : undefined,
            }
          : d
      ),
    }));
    toast.success(`Document "${formTitle}" updated`);
    setShowEditModal(false);
    setEditingDoc(null);
    resetForm();
  };

  const toggleTag = (tag: DocumentTag) => {
    setFormTags(prev => prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  };

  const DocumentRow = ({ doc }: { doc: Document }) => (
    <tr className="hover:bg-secondary/30 transition-colors">
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div className="min-w-0">
            <div className="text-sm font-medium text-foreground truncate">{doc.title}</div>
            <div className="text-[11px] text-muted-foreground">{doc.name}</div>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        <span className={cn("px-2 py-0.5 rounded-full text-[11px] font-medium", TYPE_COLORS[doc.type] || TYPE_COLORS.Other)}>
          {doc.type}
        </span>
      </td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{doc.version || '—'}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{formatDate(doc.uploadedAt, language)}</td>
      <td className="px-4 py-3 text-xs text-muted-foreground">{doc.uploadedBy}</td>
      <td className="px-4 py-3">
        <div className="flex flex-wrap gap-1">
          {doc.tags?.map(tag => (
            <span key={tag} className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", TAG_COLORS[tag])}>{tag}</span>
          ))}
        </div>
      </td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1">
          <button className="p-1.5 hover:bg-secondary rounded-md transition-colors" title="View">
            <Eye className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button className="p-1.5 hover:bg-secondary rounded-md transition-colors" title="Download">
            <Download className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => openEditModal(doc)} className="p-1.5 hover:bg-secondary rounded-md transition-colors" title="Edit">
            <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
          <button onClick={() => handleDelete(doc.id)} className="p-1.5 hover:bg-destructive/10 rounded-md transition-colors" title="Delete">
            <Trash2 className="w-3.5 h-3.5 text-destructive" />
          </button>
        </div>
      </td>
    </tr>
  );

  const DocumentFormFields = () => (
    <div className="space-y-4 py-2">
      {/* Type */}
      <div className="space-y-1.5">
        <Label className="text-xs">Document Type *</Label>
        <Select value={formType} onValueChange={v => setFormType(v as DocumentType)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            {DOCUMENT_TYPES.map(dt => (
              <SelectItem key={dt} value={dt}>{dt}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <Label className="text-xs">Document Title *</Label>
        <Input value={formTitle} onChange={e => setFormTitle(e.target.value)} placeholder="e.g. Product Requirements Document" />
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <Label className="text-xs">Description / Notes</Label>
        <Textarea rows={2} value={formDescription} onChange={e => setFormDescription(e.target.value)} placeholder="Brief description of the document..." />
      </div>

      {/* Version & Date */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className="text-xs">Version</Label>
          <Input value={formVersion} onChange={e => setFormVersion(e.target.value)} placeholder="e.g. 1.0" />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Effective Date</Label>
          <Input type="date" value={formEffectiveDate} onChange={e => setFormEffectiveDate(e.target.value)} />
        </div>
      </div>

      {/* Owner */}
      <div className="space-y-1.5">
        <Label className="text-xs">Owner / Uploaded By</Label>
        <Input value={formOwner} onChange={e => setFormOwner(e.target.value)} placeholder="Your name" />
      </div>

      {/* Tags */}
      <div className="space-y-1.5">
        <Label className="text-xs">Tags</Label>
        <div className="flex flex-wrap gap-2">
          {DOCUMENT_TAGS.map(tag => (
            <button
              key={tag}
              onClick={() => toggleTag(tag)}
              className={cn(
                "px-3 py-1.5 rounded-full text-xs font-medium border transition-colors",
                formTags.includes(tag)
                  ? `${TAG_COLORS[tag]} border-current`
                  : 'bg-secondary text-muted-foreground border-transparent hover:border-border'
              )}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  const hasActiveFilters = filterType !== 'all' || searchQuery;

  return (
    <div className="space-y-6">
      {/* Header with actions and filters */}
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-primary" />
            <h3 className="text-base font-semibold text-foreground">{t('documentation')}</h3>
            <Badge variant="secondary" className="text-xs">{documents.length}</Badge>
          </div>
          <Button size="sm" onClick={() => { resetForm(); setShowUploadModal(true); }} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {t('uploadDocument')}
          </Button>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search documents..."
              className="pl-9 h-9"
            />
          </div>
          <Select value={filterType} onValueChange={v => setFilterType(v as any)}>
            <SelectTrigger className="w-[160px] h-9"><SelectValue placeholder="Type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {DOCUMENT_TYPES.map(dt => (
                <SelectItem key={dt} value={dt}>{dt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          {hasActiveFilters && (
            <Button variant="ghost" size="sm" className="h-9 text-xs" onClick={() => { setSearchQuery(''); setFilterType('all'); }}>
              <X className="w-3.5 h-3.5 me-1" /> Clear
            </Button>
          )}
        </div>
      </div>

      {/* Documents Table */}
      {filteredDocs.length > 0 ? (
        <div className="overflow-x-auto border border-border rounded-lg">
          <table className="w-full min-w-[800px]">
            <thead className="bg-secondary/50">
              <tr>
                <th className="px-4 py-2.5 text-start text-[10px] font-medium text-muted-foreground uppercase">Title</th>
                <th className="px-4 py-2.5 text-start text-[10px] font-medium text-muted-foreground uppercase">Type</th>
                <th className="px-4 py-2.5 text-start text-[10px] font-medium text-muted-foreground uppercase">Version</th>
                <th className="px-4 py-2.5 text-start text-[10px] font-medium text-muted-foreground uppercase">Upload Date</th>
                <th className="px-4 py-2.5 text-start text-[10px] font-medium text-muted-foreground uppercase">Uploaded By</th>
                <th className="px-4 py-2.5 text-start text-[10px] font-medium text-muted-foreground uppercase">Tags</th>
                <th className="px-4 py-2.5 text-start text-[10px] font-medium text-muted-foreground uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredDocs.map(doc => <DocumentRow key={doc.id} doc={doc} />)}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 border border-dashed border-border rounded-lg">
          <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground mb-3">No product documents uploaded yet.</p>
          <Button variant="outline" size="sm" onClick={() => { resetForm(); setShowUploadModal(true); }} className="gap-1.5">
            <Plus className="w-3.5 h-3.5" /> {t('uploadDocument')}
          </Button>
        </div>
      )}

      {/* Upload Document Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="w-5 h-5 text-primary" /> Upload Document
            </DialogTitle>
          </DialogHeader>

          <DocumentFormFields />

          {/* File upload */}
          <div className="space-y-1.5">
            <Label className="text-xs">File *</Label>
            <div className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
              <input type="file" className="hidden" id="doc-file-upload" onChange={handleFileSelect} />
              <label htmlFor="doc-file-upload" className="cursor-pointer">
                {formFileName ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileText className="w-5 h-5 text-primary" />
                    <span className="text-sm font-medium text-foreground">{formFileName}</span>
                    <span className="text-xs text-muted-foreground">({formatFileSize(formFileSize)})</span>
                  </div>
                ) : (
                  <>
                    <FileText className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-sm text-muted-foreground">Click to select a file</p>
                  </>
                )}
              </label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>{t('cancel')}</Button>
            <Button onClick={handleUpload} disabled={!formTitle || !formFileName}>
              <Plus className="w-4 h-4 me-1.5" /> Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Document Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" /> Edit Document Metadata
            </DialogTitle>
          </DialogHeader>
          <DocumentFormFields />
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowEditModal(false); setEditingDoc(null); }}>{t('cancel')}</Button>
            <Button onClick={handleEditSave}>{t('save')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductDocumentation;
