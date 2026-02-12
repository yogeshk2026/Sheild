import React, { useState, useEffect } from 'react';
import { View, ScrollView, Pressable, Platform } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Check, FileText, Lock, AlertTriangle, Shield, Ban } from 'lucide-react-native';
import { Button, Text, Card } from '@/components/ui';

type TabType = 'terms' | 'coverage' | 'privacy';

// Policy version data
const CURRENT_POLICIES = [
  { type: 'terms', version: '2.0.0', effectiveDate: '2026-01-25' },
  { type: 'privacy', version: '1.0.0', effectiveDate: '2026-01-01' },
  { type: 'coverage', version: '2.0.0', effectiveDate: '2026-01-25' },
];

const ELIGIBILITY_RULES = [
  { id: 'el-1', requirement: "Valid Driver's License", description: 'You must hold a valid driver\'s license in the state where you operate.' },
  { id: 'el-2', requirement: 'Age Requirement', description: 'You must be at least 18 years old to use Courial Shield.' },
  { id: 'el-3', requirement: 'Registered Vehicle', description: 'Your vehicle must be properly registered.' },
  { id: 'el-4', requirement: 'Active Gig Work', description: 'You must be actively working for a delivery or rideshare platform.' },
  { id: 'el-5', requirement: 'Active Membership', description: 'Your membership must be active at the time the ticket was issued.' },
  { id: 'el-6', requirement: '30-Day Waiting Period', description: 'No claims may be filed for citations issued within the first 30 days of active membership.' },
];

const CLAIM_REQUIREMENTS = [
  { id: 'req-1', requirement: 'Photo of Ticket', description: 'Clear, legible photo showing ticket details.', required: true },
  { id: 'req-2', requirement: 'Ticket Number', description: 'The unique citation number printed on the ticket.', required: true },
  { id: 'req-3', requirement: 'Ticket Date', description: 'The date the ticket was issued (within 5 days).', required: true },
  { id: 'req-4', requirement: 'Location', description: 'City and state where the ticket was issued.', required: true },
  { id: 'req-5', requirement: 'Violation Type', description: 'The type of parking violation.', required: true },
  { id: 'req-6', requirement: 'Ticket Amount', description: 'The total fine amount shown on the ticket.', required: true },
  { id: 'req-7', requirement: 'Pre-Submission Questions', description: 'Answer required questions about signage, errors, and payment.', required: true },
];

// Absolute exclusions - NO EXCEPTIONS
const ABSOLUTE_EXCLUSIONS = [
  { violation: 'Fire Hydrant', description: 'Parking within 15 feet of a fire hydrant' },
  { violation: 'Handicap/Disability Zone', description: 'Parking in designated handicap/disability zones without a valid permit' },
  { violation: 'Double Parking', description: 'Blocking an active traffic lane' },
  { violation: 'Blocking Intersection', description: 'Blocking an intersection ("Blocking the Box")' },
  { violation: 'Criminal Violations', description: 'Citations involving felonies, DUIs, or moving violations' },
];

const GENERAL_EXCLUSIONS = [
  'Tickets received while vehicle is parked for personal use',
  'Tickets in designated tow-away zones',
  'Tickets for moving violations',
  'Tickets issued more than 5 days before claim submission',
  'Tickets received after membership cancellation',
  'Tickets issued during the 30-day waiting period',
  'Fraudulent or altered tickets',
];

export default function TermsScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [activeTab, setActiveTab] = useState<TabType>('terms');
  const [accepted, setAccepted] = useState(false);

  const requireAcceptance = params?.accept === 'true';

  useEffect(() => {
    const tabParam = params?.tab;
    if (tabParam === 'coverage' || tabParam === 'privacy' || tabParam === 'terms') {
      setActiveTab(tabParam as TabType);
    }
  }, [params?.tab]);

  const handleAccept = () => {
    router.back();
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Terms & Membership Agreement',
          headerBackTitle: 'Back',
          headerStyle: { backgroundColor: '#F8FAFC' },
        }}
      />

      <View style={{ flex: 1, backgroundColor: '#F8FAFC' }}>
        {Platform.OS !== 'web' ? (
          <SafeAreaView style={{ flex: 1 }} edges={['bottom']}>
            <TabContent
              activeTab={activeTab}
              handleTabChange={handleTabChange}
              requireAcceptance={requireAcceptance}
              accepted={accepted}
              setAccepted={setAccepted}
              handleAccept={handleAccept}
            />
          </SafeAreaView>
        ) : (
          <TabContent
            activeTab={activeTab}
            handleTabChange={handleTabChange}
            requireAcceptance={requireAcceptance}
            accepted={accepted}
            setAccepted={setAccepted}
            handleAccept={handleAccept}
          />
        )}
      </View>
    </>
  );
}

function TabContent({
  activeTab,
  handleTabChange,
  requireAcceptance,
  accepted,
  setAccepted,
  handleAccept,
}: {
  activeTab: TabType;
  handleTabChange: (tab: TabType) => void;
  requireAcceptance: boolean;
  accepted: boolean;
  setAccepted: (v: boolean) => void;
  handleAccept: () => void;
}) {
  return (
    <>
      {/* Tab Selector */}
      <View style={{ paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#FFFFFF', borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}>
        <View style={{ flexDirection: 'row', backgroundColor: '#F3F4F6', borderRadius: 12, padding: 4 }}>
          <TabButton
            label="Terms"
            icon={<FileText size={16} color={activeTab === 'terms' ? '#F97316' : '#6B7280'} />}
            isActive={activeTab === 'terms'}
            onPress={() => handleTabChange('terms')}
          />
          <TabButton
            label="Protection"
            icon={<Shield size={16} color={activeTab === 'coverage' ? '#F97316' : '#6B7280'} />}
            isActive={activeTab === 'coverage'}
            onPress={() => handleTabChange('coverage')}
          />
          <TabButton
            label="Privacy"
            icon={<Lock size={16} color={activeTab === 'privacy' ? '#F97316' : '#6B7280'} />}
            isActive={activeTab === 'privacy'}
            onPress={() => handleTabChange('privacy')}
          />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingBottom: requireAcceptance ? 140 : 40 }}
      >
        {activeTab === 'terms' && <TermsContent />}
        {activeTab === 'coverage' && <CoverageContent />}
        {activeTab === 'privacy' && <PrivacyContent />}
      </ScrollView>

      {requireAcceptance && (
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#FFFFFF', borderTopWidth: 1, borderTopColor: '#F3F4F6', paddingHorizontal: 20, paddingVertical: 16, paddingBottom: 32 }}>
          <Pressable
            onPress={() => setAccepted(!accepted)}
            style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}
          >
            <View
              style={{
                width: 24,
                height: 24,
                borderRadius: 6,
                borderWidth: 2,
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
                backgroundColor: accepted ? '#F97316' : 'transparent',
                borderColor: accepted ? '#F97316' : '#D1D5DB',
              }}
            >
              {accepted && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
            </View>
            <Text style={{ color: '#6B7280', flex: 1, fontSize: 14 }}>
              I have read and agree to the Terms of Service, Membership Agreement, and Privacy Policy
            </Text>
          </Pressable>
          <Button onPress={handleAccept} disabled={!accepted} fullWidth size="lg" pill>
            Accept & Continue
          </Button>
        </View>
      )}
    </>
  );
}

function TabButton({
  label,
  icon,
  isActive,
  onPress,
}: {
  label: string;
  icon: React.ReactNode;
  isActive: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={{
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10,
        borderRadius: 8,
        backgroundColor: isActive ? '#FFFFFF' : 'transparent',
      }}
    >
      {icon}
      <Text
        style={{
          marginLeft: 6,
          fontWeight: '500',
          color: isActive ? '#F97316' : '#6B7280',
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function TermsContent() {
  const termsPolicy = CURRENT_POLICIES.find(p => p.type === 'terms');

  return (
    <View>
      <Text className="text-shield-black text-2xl font-bold mb-2">Terms of Service & Membership Agreement</Text>
      <Text className="text-gray-500 text-sm mb-6">
        Version {termsPolicy?.version} • Effective {termsPolicy?.effectiveDate}
      </Text>

      {/* Important Notice */}
      <View style={{ borderRadius: 16, overflow: 'hidden', marginBottom: 24 }}>
        <Card className="bg-amber-50 border border-amber-200">
          <View className="flex-row items-start">
            <AlertTriangle size={20} color="#F59E0B" />
            <View className="flex-1 ml-3">
              <Text className="text-amber-800 font-bold mb-2">IMPORTANT: NOT AN INSURANCE PRODUCT</Text>
              <Text className="text-amber-700 text-sm leading-5">
                This is NOT an insurance contract. Courial Shield is a Legal Defense and Service Warranty Membership.
                We do not indemnify the user against criminal or civil liability. We provide administrative assistance
                to contest citations and limited discretionary reimbursement credits for losses incurred despite our
                defense efforts.
              </Text>
            </View>
          </View>
        </Card>
      </View>

      <Section title="1. Nature of Service">
        <Text className="text-gray-600 leading-relaxed mb-3">
          Courial Shield is a Legal Defense and Service Warranty Membership designed for gig economy drivers.
          By subscribing, you gain access to:
        </Text>
        <View className="space-y-2 mb-3">
          {[
            'Administrative assistance to contest parking citations',
            'Discretionary reimbursement credits for eligible tickets after defense efforts',
            'Priority support for ticket-related issues',
          ].map((item, index) => (
            <View key={index} className="flex-row items-start">
              <Check size={16} color="#22C55E" style={{ marginTop: 2 }} />
              <Text className="text-gray-600 flex-1 ml-2">{item}</Text>
            </View>
          ))}
        </View>
        <Card className="bg-gray-100">
          <Text className="text-gray-700 text-sm font-medium">
            Courial Shield does NOT pay municipalities or cities directly. Reimbursements are sent to Members only.
            It is your sole responsibility to pay any citation to the issuing authority.
          </Text>
        </Card>
      </Section>

      <Section title="2. Membership Tiers & Limitations">
        <Text className="text-gray-600 mb-4">
          Your membership tier determines your annual reimbursement cap and member co-pay (deductible):
        </Text>
        <Card className="mb-3">
          <View className="space-y-4">
            <View className="pb-3 border-b border-gray-100">
              <Text className="text-shield-black font-bold text-lg">Basic</Text>
              <Text className="text-gray-500 text-sm mb-2">Suburban / Part-time drivers</Text>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Annual Cap:</Text>
                <Text className="text-shield-black font-semibold">$100.00</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Member Co-Pay:</Text>
                <Text className="text-shield-black font-semibold">20% per ticket</Text>
              </View>
            </View>
            <View className="pb-3 border-b border-gray-100">
              <Text className="text-shield-black font-bold text-lg">Pro</Text>
              <Text className="text-gray-500 text-sm mb-2">City drivers (20-30 hrs/week)</Text>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Annual Cap:</Text>
                <Text className="text-shield-black font-semibold">$350.00</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Member Co-Pay:</Text>
                <Text className="text-shield-black font-semibold">15% per ticket</Text>
              </View>
            </View>
            <View>
              <Text className="text-shield-black font-bold text-lg">Professional</Text>
              <Text className="text-gray-500 text-sm mb-2">Full-time (40+ hrs/week)</Text>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Annual Cap:</Text>
                <Text className="text-shield-black font-semibold">$600.00</Text>
              </View>
              <View className="flex-row justify-between">
                <Text className="text-gray-600">Member Co-Pay:</Text>
                <Text className="text-shield-black font-semibold">15% per ticket</Text>
              </View>
              <View className="bg-emerald-50 rounded-lg p-2 mt-2">
                <Text className="text-emerald-700 text-sm">Includes $100 one-time towing credit</Text>
              </View>
            </View>
          </View>
        </Card>
        <Text className="text-gray-500 text-sm">
          Professional Plan requires proof of active gig-economy employment (earnings dashboard screenshot).
        </Text>
      </Section>

      <Section title="3. Waiting Period & Effective Date">
        <Card className="bg-orange-50 border border-orange-200">
          <Text className="text-orange-800 font-bold mb-2">30-Day Cooling-Off Period</Text>
          <Text className="text-orange-700 text-sm leading-5">
            No claims may be filed for citations issued within the first 30 days of active membership.
            Protection applies only to citations issued after the 30-day waiting period from your membership start date.
          </Text>
        </Card>
      </Section>

      <Section title="4. Claims Process & Payouts">
        <Text className="text-gray-600 mb-3">Understanding how claims work:</Text>

        <Card className="mb-3">
          <Text className="text-shield-black font-semibold mb-2">Submission Window</Text>
          <Text className="text-gray-600 text-sm">
            Citations must be uploaded within 5 days of issuance.
          </Text>
        </Card>

        <Card className="mb-3">
          <Text className="text-shield-black font-semibold mb-2">Defense First</Text>
          <Text className="text-gray-600 text-sm">
            You agree to allow Courial Shield to contest the citation first. Reimbursement is only
            considered after a contest is lost or not viable.
          </Text>
        </Card>

        <Card className="mb-3">
          <Text className="text-shield-black font-semibold mb-2">Payment Method</Text>
          <Text className="text-gray-600 text-sm">
            Reimbursements are sent directly to you, the Member. It is your sole responsibility to pay
            the municipality/city. Courial Shield does NOT pay cities directly.
          </Text>
        </Card>

        <Card>
          <Text className="text-shield-black font-semibold mb-2">Reimbursement Calculation</Text>
          <Text className="text-gray-600 text-sm">
            Reimbursement = Eligible Amount × (1 - Deductible%). Result never exceeds your remaining annual cap.
          </Text>
        </Card>
      </Section>

      <Section title="5. Eligibility Requirements">
        <Text className="text-gray-600 mb-3">
          To maintain membership and file claims, you must meet:
        </Text>
        {ELIGIBILITY_RULES.map((rule, index) => (
          <View key={rule.id} className="flex-row items-start mb-2">
            <View className="w-5 h-5 rounded-full bg-orange-100 items-center justify-center mt-0.5 mr-2">
              <Text className="text-shield-accent text-xs font-bold">{index + 1}</Text>
            </View>
            <View className="flex-1">
              <Text className="text-shield-black font-medium">{rule.requirement}</Text>
              <Text className="text-gray-500 text-sm">{rule.description}</Text>
            </View>
          </View>
        ))}
      </Section>

      <Section title="6. Termination for Excessive Use">
        <Card className="bg-red-50 border border-red-100">
          <View className="flex-row items-start">
            <AlertTriangle size={20} color="#EF4444" />
            <View className="flex-1 ml-3">
              <Text className="text-red-800 font-semibold mb-2">Fair Use Policy</Text>
              <Text className="text-red-700 text-sm leading-5">
                Courial Shield reserves the right to terminate the membership of any user who demonstrates
                a pattern of gross negligence or whose claim frequency exceeds 3 standard deviations of the
                user average. This policy helps keep membership costs affordable for all drivers.
              </Text>
            </View>
          </View>
        </Card>
      </Section>

      <Section title="7. Subscription & Billing">
        <BillingTerms />
      </Section>

      <Section title="8. Contact Us">
        <Text className="text-gray-600">
          If you have questions about these terms, please contact us at support@courial.com
        </Text>
      </Section>
    </View>
  );
}

function CoverageContent() {
  const coveragePolicy = CURRENT_POLICIES.find(p => p.type === 'coverage');

  return (
    <View>
      <Text className="text-shield-black text-2xl font-bold mb-2">Protection Policy</Text>
      <Text className="text-gray-500 text-sm mb-6">
        Version {coveragePolicy?.version} • Effective {coveragePolicy?.effectiveDate}
      </Text>

      <Section title="What's Eligible for Defense">
        <Text className="text-gray-600 mb-3">
          Courial Shield provides defense assistance for parking tickets received while actively performing gig work:
        </Text>
        <View className="space-y-2">
          {[
            { type: 'Expired Meter', desc: 'Parking meter violations' },
            { type: 'Street Cleaning', desc: 'Street sweeping violations' },
            { type: 'No Parking Zone', desc: 'Temporary no-parking violations' },
            { type: 'Loading Zone', desc: 'Commercial loading zone violations' },
          ].map((item) => (
            <View key={item.type} className="flex-row items-center bg-green-50 rounded-lg p-3">
              <Check size={18} color="#22C55E" />
              <View className="ml-3">
                <Text className="text-green-800 font-medium">{item.type}</Text>
                <Text className="text-green-600 text-xs">{item.desc}</Text>
              </View>
            </View>
          ))}
        </View>
      </Section>

      {/* ABSOLUTE EXCLUSIONS */}
      <Section title="Excluded Violations (ABSOLUTE - NO EXCEPTIONS)">
        <Card className="bg-red-50 border-2 border-red-300 mb-4">
          <View className="flex-row items-center mb-3">
            <Ban size={24} color="#DC2626" />
            <Text className="text-red-800 font-bold text-lg ml-2">NEVER ELIGIBLE</Text>
          </View>
          <Text className="text-red-700 text-sm mb-4">
            The following violations are ABSOLUTELY EXCLUDED and will NEVER be eligible for defense
            or reimbursement, regardless of circumstances. There are NO exceptions.
          </Text>
          {ABSOLUTE_EXCLUSIONS.map((exclusion, index) => (
            <View key={index} className="flex-row items-start mb-3 bg-red-100 rounded-lg p-3">
              <Ban size={16} color="#DC2626" style={{ marginTop: 2 }} />
              <View className="flex-1 ml-2">
                <Text className="text-red-800 font-semibold">{exclusion.violation}</Text>
                <Text className="text-red-700 text-sm">{exclusion.description}</Text>
              </View>
            </View>
          ))}
        </Card>
      </Section>

      <Section title="Other Exclusions">
        <Text className="text-gray-600 mb-3">
          The following are also excluded from protection:
        </Text>
        {GENERAL_EXCLUSIONS.map((exclusion, index) => (
          <View key={index} className="flex-row items-start mb-2">
            <View className="w-2 h-2 rounded-full bg-red-400 mt-2 mr-3" />
            <Text className="text-gray-600 flex-1">{exclusion}</Text>
          </View>
        ))}
      </Section>

      <Section title="Plan Limits & Deductibles">
        <Card>
          <Text className="text-shield-black font-semibold mb-3">Membership Tiers</Text>
          <View className="space-y-3">
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Basic</Text>
              <View className="items-end">
                <Text className="text-shield-black font-medium">$100/year cap</Text>
                <Text className="text-gray-500 text-xs">20% co-pay</Text>
              </View>
            </View>
            <View className="flex-row justify-between py-2 border-b border-gray-100">
              <Text className="text-gray-600">Pro</Text>
              <View className="items-end">
                <Text className="text-shield-black font-medium">$350/year cap</Text>
                <Text className="text-gray-500 text-xs">15% co-pay</Text>
              </View>
            </View>
            <View className="flex-row justify-between py-2">
              <Text className="text-gray-600">Professional</Text>
              <View className="items-end">
                <Text className="text-shield-black font-medium">$600/year cap</Text>
                <Text className="text-gray-500 text-xs">15% co-pay + $100 towing credit</Text>
              </View>
            </View>
          </View>
        </Card>
        <Text className="text-gray-500 text-sm mt-3">
          Reimbursement limits reset annually on your membership anniversary date.
        </Text>
      </Section>

      <Section title="Claim Submission Timeline">
        <Card className="bg-orange-50 border border-orange-100">
          <Text className="text-orange-800 font-semibold mb-2">5-Day Submission Window</Text>
          <Text className="text-orange-700 text-sm">
            Claims must be submitted within 5 days of the ticket date.
          </Text>
        </Card>
      </Section>

      <Section title="Pre-Submission Requirements">
        <Text className="text-gray-600 mb-3">
          Before uploading a ticket photo, you must answer these questions:
        </Text>
        <Card>
          <View className="space-y-3">
            <View className="flex-row items-start">
              <Text className="text-shield-black font-bold mr-2">1.</Text>
              <Text className="text-gray-600 flex-1">"Was the signage confusing or hidden?"</Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-shield-black font-bold mr-2">2.</Text>
              <Text className="text-gray-600 flex-1">"Is there a typo or error on the ticket?"</Text>
            </View>
            <View className="flex-row items-start">
              <Text className="text-shield-black font-bold mr-2">3.</Text>
              <Text className="text-gray-600 flex-1">"Did you have a valid permit/payment?"</Text>
            </View>
          </View>
        </Card>
      </Section>
    </View>
  );
}

function PrivacyContent() {
  const privacyPolicy = CURRENT_POLICIES.find(p => p.type === 'privacy');

  return (
    <View>
      <Text className="text-shield-black text-2xl font-bold mb-2">Privacy Policy</Text>
      <Text className="text-gray-500 text-sm mb-6">
        Version {privacyPolicy?.version} • Effective {privacyPolicy?.effectiveDate}
      </Text>

      <Section title="Information We Collect">
        <Text className="text-gray-600 mb-3">We collect the following information:</Text>
        {[
          'Account information (name, email, phone)',
          'Payment information (processed securely via Stripe)',
          'Ticket photos and claim details',
          'Device information for fraud prevention',
          'Location data (only when submitting claims)',
          'Proof of gig work (for Professional tier verification)',
        ].map((item, index) => (
          <View key={index} className="flex-row items-start mb-2">
            <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-3" />
            <Text className="text-gray-600 flex-1">{item}</Text>
          </View>
        ))}
      </Section>

      <Section title="How We Use Your Information">
        <Text className="text-gray-600 mb-3">Your information is used to:</Text>
        {[
          'Process your membership and payments',
          'Review and process your claims',
          'Contest citations on your behalf',
          'Prevent fraud and abuse',
          'Improve our services',
          'Communicate important updates',
        ].map((item, index) => (
          <View key={index} className="flex-row items-start mb-2">
            <View style={{ marginTop: 2, marginRight: 8 }}>
              <Check size={16} color="#22C55E" />
            </View>
            <Text className="text-gray-600 flex-1">{item}</Text>
          </View>
        ))}
      </Section>

      <Section title="Data Security">
        <Card className="bg-blue-50 border border-blue-100">
          <View className="flex-row items-start">
            <Lock size={20} color="#3B82F6" />
            <View className="flex-1 ml-3">
              <Text className="text-blue-800 font-semibold mb-1">Your Data is Protected</Text>
              <Text className="text-blue-700 text-sm">
                We use industry-standard encryption and security measures to protect your
                personal information.
              </Text>
            </View>
          </View>
        </Card>
      </Section>

      <Section title="Your Rights">
        <Text className="text-gray-600 mb-3">You have the right to:</Text>
        {[
          'Access your personal data',
          'Request data deletion',
          'Opt out of marketing communications',
          'Export your data',
        ].map((item, index) => (
          <View key={index} className="flex-row items-start mb-2">
            <View className="w-2 h-2 rounded-full bg-shield-accent mt-2 mr-3" />
            <Text className="text-gray-600 flex-1">{item}</Text>
          </View>
        ))}
      </Section>

      <Section title="Contact Us">
        <Text className="text-gray-600">
          For privacy-related inquiries, please contact us at privacy@courial.com
        </Text>
      </Section>
    </View>
  );
}

function BillingTerms() {
  return (
    <View>
      <Text className="text-gray-600 mb-3">
        By subscribing to Courial Shield, you agree to the following billing terms:
      </Text>

      <View className="space-y-3">
        <Card>
          <Text className="text-shield-black font-semibold mb-2">Advance Billing</Text>
          <Text className="text-gray-600 text-sm">
            All memberships are billed in advance at the beginning of each billing period.
          </Text>
        </Card>

        <Card>
          <Text className="text-shield-black font-semibold mb-2">Auto-Renewal</Text>
          <Text className="text-gray-600 text-sm">
            Your membership will automatically renew unless you cancel before the renewal date.
          </Text>
        </Card>

        <Card>
          <Text className="text-shield-black font-semibold mb-2">90-Day Cancellation Restriction</Text>
          <Text className="text-gray-600 text-sm">
            You cannot cancel your membership within 90 days of receiving a claim reimbursement.
            This helps prevent abuse of the membership system.
          </Text>
        </Card>

        <Card>
          <Text className="text-shield-black font-semibold mb-2">Failed Payments</Text>
          <Text className="text-gray-600 text-sm">
            If a payment fails, we will retry up to 3 times. After 7 days, membership will be suspended.
          </Text>
        </Card>

        <Card>
          <Text className="text-shield-black font-semibold mb-2">No Refunds</Text>
          <Text className="text-gray-600 text-sm">
            Membership fees are non-refundable. Protection continues until the end of your billing period.
          </Text>
        </Card>
      </View>
    </View>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View className="mb-6">
      <Text className="text-shield-black text-lg font-bold mb-3">{title}</Text>
      {children}
    </View>
  );
}
