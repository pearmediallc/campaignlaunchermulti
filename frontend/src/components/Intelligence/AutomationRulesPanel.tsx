/**
 * AutomationRulesPanel.tsx
 *
 * Manages automation rules for campaign optimization.
 * Users can create, edit, enable/disable, and delete rules.
 */

import React, { useState, useEffect } from 'react';
import {
  Box,
  Paper,
  Typography,
  Button,
  Card,
  CardContent,
  CardActions,
  Switch,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions as MuiDialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  Alert,
  Divider,
  FormControlLabel,
  Accordion,
  AccordionSummary,
  AccordionDetails,
} from '@mui/material';
import Grid from '@mui/material/Grid';
import {
  Add,
  Delete,
  Edit,
  ExpandMore,
  PlayArrow,
  Pause,
  TrendingUp,
  Warning,
  Shield,
  Schedule,
} from '@mui/icons-material';
import { toast } from 'react-toastify';
import { intelligenceApi, AutomationRule, RuleTemplate } from '../../services/intelligenceApi';

interface AutomationRulesPanelProps {
  onRefresh: () => void;
}

const AutomationRulesPanel: React.FC<AutomationRulesPanelProps> = ({ onRefresh }) => {
  const [rules, setRules] = useState<AutomationRule[]>([]);
  const [templates, setTemplates] = useState<RuleTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<RuleTemplate | null>(null);
  const [newRule, setNewRule] = useState<Partial<AutomationRule>>({
    name: '',
    description: '',
    rule_type: 'custom',
    entity_type: 'adset',
    conditions: [],
    condition_logic: 'AND',
    actions: [],
    requires_approval: true,
    cooldown_hours: 24,
    evaluation_window_hours: 24,
  });

  useEffect(() => {
    fetchRules();
    fetchTemplates();
  }, []);

  const fetchRules = async () => {
    try {
      const response = await intelligenceApi.getRules();
      if (response.success) {
        setRules(response.rules);
      }
    } catch (error) {
      console.error('Failed to fetch rules:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTemplates = async () => {
    try {
      const response = await intelligenceApi.getRuleTemplates();
      if (response.success) {
        setTemplates(response.templates);
      }
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    }
  };

  const handleToggleRule = async (rule: AutomationRule) => {
    try {
      await intelligenceApi.updateRule(rule.id, { is_active: !rule.is_active });
      toast.success(`Rule ${rule.is_active ? 'disabled' : 'enabled'}`);
      fetchRules();
    } catch (error) {
      toast.error('Failed to update rule');
    }
  };

  const handleDeleteRule = async (ruleId: number) => {
    if (!window.confirm('Are you sure you want to delete this rule?')) return;

    try {
      await intelligenceApi.deleteRule(ruleId);
      toast.success('Rule deleted');
      fetchRules();
    } catch (error) {
      toast.error('Failed to delete rule');
    }
  };

  const handleCreateFromTemplate = (template: RuleTemplate) => {
    setSelectedTemplate(template);
    setNewRule({
      ...template,
      is_active: true,
    });
    setCreateDialogOpen(true);
  };

  const handleCreateRule = async () => {
    try {
      await intelligenceApi.createRule(newRule);
      toast.success('Rule created successfully');
      setCreateDialogOpen(false);
      fetchRules();
      onRefresh();
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Failed to create rule');
    }
  };

  const getRuleTypeIcon = (type: string) => {
    switch (type) {
      case 'loss_prevention':
        return <Shield color="error" />;
      case 'scaling':
        return <TrendingUp color="success" />;
      case 'learning_protection':
        return <Warning color="warning" />;
      case 'fatigue_detection':
        return <Schedule color="info" />;
      default:
        return <PlayArrow />;
    }
  };

  const getRuleTypeLabel = (type: string) => {
    return type.split('_').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  return (
    <Box>
      {/* Templates Section */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          Quick Start Templates
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Create rules from pre-configured templates
        </Typography>
        <Grid container spacing={2}>
          {templates.map((template, idx) => (
            <Grid size={{ xs: 12, sm: 6, md: 3 }} key={idx}>
              <Card variant="outlined" sx={{ height: '100%' }}>
                <CardContent>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    {getRuleTypeIcon(template.rule_type)}
                    <Typography variant="subtitle2" noWrap>
                      {template.name}
                    </Typography>
                  </Box>
                  <Typography variant="caption" color="text.secondary">
                    {template.description}
                  </Typography>
                </CardContent>
                <CardActions>
                  <Button
                    size="small"
                    startIcon={<Add />}
                    onClick={() => handleCreateFromTemplate(template)}
                  >
                    Use Template
                  </Button>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Paper>

      {/* Active Rules */}
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h6">
          Your Rules ({rules.length})
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => {
            setSelectedTemplate(null);
            setNewRule({
              name: '',
              description: '',
              rule_type: 'custom',
              entity_type: 'adset',
              conditions: [],
              condition_logic: 'AND',
              actions: [],
              requires_approval: true,
              cooldown_hours: 24,
              evaluation_window_hours: 24,
            });
            setCreateDialogOpen(true);
          }}
        >
          Create Custom Rule
        </Button>
      </Box>

      {rules.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Typography color="text.secondary">
            No automation rules configured. Use a template or create a custom rule to get started.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={2}>
          {rules.map((rule) => (
            <Grid size={{ xs: 12, md: 6 }} key={rule.id}>
              <Card sx={{ opacity: rule.is_active ? 1 : 0.7 }}>
                <CardContent>
                  <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                    <Box display="flex" alignItems="center" gap={1}>
                      {getRuleTypeIcon(rule.rule_type)}
                      <Box>
                        <Typography variant="h6">{rule.name}</Typography>
                        <Chip
                          label={getRuleTypeLabel(rule.rule_type)}
                          size="small"
                          variant="outlined"
                        />
                      </Box>
                    </Box>
                    <Switch
                      checked={rule.is_active}
                      onChange={() => handleToggleRule(rule)}
                    />
                  </Box>

                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    {rule.description}
                  </Typography>

                  <Box mt={2}>
                    <Typography variant="caption" color="text.secondary">
                      Conditions ({rule.condition_logic}):
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                      {rule.conditions.map((cond, idx) => (
                        <Chip
                          key={idx}
                          label={`${cond.metric} ${cond.operator} ${cond.value}`}
                          size="small"
                          variant="outlined"
                        />
                      ))}
                    </Box>
                  </Box>

                  <Box mt={1}>
                    <Typography variant="caption" color="text.secondary">
                      Actions:
                    </Typography>
                    <Box display="flex" gap={0.5} flexWrap="wrap" mt={0.5}>
                      {rule.actions.map((action, idx) => (
                        <Chip
                          key={idx}
                          label={action.action.replace(/_/g, ' ')}
                          size="small"
                          color="primary"
                        />
                      ))}
                    </Box>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="caption" color="text.secondary">
                      Triggered {rule.times_triggered} time{rule.times_triggered !== 1 ? 's' : ''}
                      {rule.last_triggered_at && (
                        <> | Last: {new Date(rule.last_triggered_at).toLocaleDateString()}</>
                      )}
                    </Typography>
                    <Box>
                      {rule.requires_approval && (
                        <Chip
                          label="Approval Required"
                          size="small"
                          color="warning"
                          variant="outlined"
                          sx={{ mr: 1 }}
                        />
                      )}
                    </Box>
                  </Box>
                </CardContent>
                <CardActions>
                  <Tooltip title="Delete Rule">
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => handleDeleteRule(rule.id)}
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create Rule Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedTemplate ? `Create Rule from "${selectedTemplate.name}"` : 'Create Custom Rule'}
        </DialogTitle>
        <DialogContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid size={12}>
              <TextField
                fullWidth
                label="Rule Name"
                value={newRule.name}
                onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
              />
            </Grid>
            <Grid size={12}>
              <TextField
                fullWidth
                multiline
                rows={2}
                label="Description"
                value={newRule.description}
                onChange={(e) => setNewRule({ ...newRule, description: e.target.value })}
              />
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Rule Type</InputLabel>
                <Select
                  value={newRule.rule_type}
                  label="Rule Type"
                  onChange={(e) => setNewRule({ ...newRule, rule_type: e.target.value })}
                >
                  <MenuItem value="loss_prevention">Loss Prevention</MenuItem>
                  <MenuItem value="scaling">Scaling</MenuItem>
                  <MenuItem value="learning_protection">Learning Protection</MenuItem>
                  <MenuItem value="fatigue_detection">Fatigue Detection</MenuItem>
                  <MenuItem value="custom">Custom</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <FormControl fullWidth>
                <InputLabel>Entity Type</InputLabel>
                <Select
                  value={newRule.entity_type}
                  label="Entity Type"
                  onChange={(e) => setNewRule({ ...newRule, entity_type: e.target.value })}
                >
                  <MenuItem value="campaign">Campaign</MenuItem>
                  <MenuItem value="adset">Ad Set</MenuItem>
                  <MenuItem value="ad">Ad</MenuItem>
                  <MenuItem value="all">All</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                type="number"
                label="Cooldown (hours)"
                value={newRule.cooldown_hours}
                onChange={(e) => setNewRule({ ...newRule, cooldown_hours: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid size={6}>
              <TextField
                fullWidth
                type="number"
                label="Evaluation Window (hours)"
                value={newRule.evaluation_window_hours}
                onChange={(e) => setNewRule({ ...newRule, evaluation_window_hours: parseInt(e.target.value) })}
              />
            </Grid>
            <Grid size={12}>
              <FormControlLabel
                control={
                  <Switch
                    checked={newRule.requires_approval}
                    onChange={(e) => setNewRule({ ...newRule, requires_approval: e.target.checked })}
                  />
                }
                label="Require approval before executing actions"
              />
              <Alert severity="warning" sx={{ mt: 1 }}>
                We recommend keeping approval required until you're confident in the rule's behavior.
              </Alert>
            </Grid>
          </Grid>
        </DialogContent>
        <MuiDialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateRule}>
            Create Rule
          </Button>
        </MuiDialogActions>
      </Dialog>
    </Box>
  );
};

export default AutomationRulesPanel;
