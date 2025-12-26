import { useNavigate } from 'react-router-dom';
import { useLanguage } from '@/contexts/LanguageContext';
import { LanguageToggle } from '@/components/LanguageToggle';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Building2, DollarSign, Users, TrendingUp, Shield, Clock, Mail } from 'lucide-react';

export default function Landing() {
  const { t, language } = useLanguage();
  const navigate = useNavigate();

  const features = [
    {
      icon: DollarSign,
      title: 'Donation Management',
      description: 'Track and manage all donations with automated receipt generation and reporting',
    },
    {
      icon: Users,
      title: 'Donor Database',
      description: 'Maintain comprehensive donor profiles with donation history and communication preferences',
    },
    {
      icon: TrendingUp,
      title: 'Analytics & Insights',
      description: 'View real-time statistics and generate detailed reports for better decision making',
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Bank-level security with full compliance for handling sensitive donor information',
    },
    {
      icon: Clock,
      title: 'Pledge Tracking',
      description: 'Manage recurring pledges with automated reminders and payment tracking',
    },
    {
      icon: Mail,
      title: 'Automated Communications',
      description: 'Send receipts and thank you notes automatically to donors',
    },
  ];

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-accent/20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
      <div className="absolute top-20 left-20 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-glow" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-accent/20 rounded-full blur-3xl animate-glow" style={{ animationDelay: '1s' }} />
      
      {/* Header */}
      <header className="relative z-10 border-b border-border/50 bg-card/95 backdrop-blur-xl">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-primary flex items-center justify-center shadow-lg">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              {t('app.title')}
            </h1>
          </div>
          <div className="flex items-center gap-3">
            <LanguageToggle />
            <Button
              variant="ghost"
              onClick={() => navigate('/auth')}
              className="hidden sm:flex"
            >
              Sign In
            </Button>
            <Button
              onClick={() => navigate('/register')}
              className="bg-gradient-primary hover:opacity-90 shadow-lg"
            >
              Get Started
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative z-10 container mx-auto px-6 py-20 text-center">
        <div className="max-w-4xl mx-auto space-y-8 animate-fade-up">
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight">
            <span className="bg-gradient-primary bg-clip-text text-transparent">
              Modern Management Platform
            </span>
            <br />
            <span className="text-foreground">
              for Synagogues
            </span>
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Streamline your fundraising, track donations, and engage with your community - all in one powerful platform
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center pt-6">
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-gradient-primary hover:opacity-90 shadow-glow text-lg px-8 py-6 h-auto"
            >
              Register Your Synagogue
            </Button>
            <Button
              size="lg"
              variant="outline"
              onClick={() => navigate('/auth')}
              className="border-primary/30 hover:bg-primary/5 text-lg px-8 py-6 h-auto"
            >
              Sign In
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className={`relative z-10 container mx-auto px-6 py-20 ${language === 'he' ? 'text-right' : ''}`}>
        <div className="text-center mb-16 animate-fade-up">
          <h3 className="text-3xl sm:text-4xl font-bold mb-4">
            Everything You Need to Manage Communication, Donations, Campaigns
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Powerful tools designed specifically for synagogue fundraising and donor management
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {features.map((feature, index) => (
            <Card
              key={index}
              className="border-primary/20 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6 space-y-4">
                <div className="w-12 h-12 rounded-lg bg-gradient-primary flex items-center justify-center">
                  <feature.icon className="w-6 h-6 text-white" />
                </div>
                <h4 className="text-xl font-semibold">{feature.title}</h4>
                <p className="text-muted-foreground">{feature.description}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Pricing Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <div className="text-center mb-16 animate-fade-up">
          <h3 className="text-3xl sm:text-4xl font-bold mb-4">
            Flexible Pricing for Every Size
          </h3>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Choose a plan that grows with your congregation
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {[
            { name: 'Basic', price: '$99', members: 'Up to 50 members', tier: 'tier_1' },
            { name: 'Standard', price: '$149', members: '51-100 members', tier: 'tier_2' },
            { name: 'Professional', price: '$199', members: '101-250 members', tier: 'tier_3' },
            { name: 'Enterprise', price: '$249', members: '251+ members', tier: 'tier_4' },
          ].map((plan, index) => (
            <Card
              key={index}
              className="border-primary/20 bg-card/50 backdrop-blur-sm hover:shadow-glow transition-all duration-300 animate-scale-in"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <CardContent className="p-6 space-y-4 text-center">
                <h4 className="text-2xl font-bold">{plan.name}</h4>
                <div className="space-y-1">
                  <p className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    {plan.price}
                  </p>
                  <p className="text-sm text-muted-foreground">per month</p>
                </div>
                <p className="text-muted-foreground pb-4 border-b">{plan.members}</p>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  <li>✓ Unlimited donations</li>
                  <li>✓ Donor management</li>
                  <li>✓ Receipt generation</li>
                  <li>✓ Analytics & reports</li>
                  <li>✓ Email support</li>
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 container mx-auto px-6 py-20">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 to-accent/10 backdrop-blur-sm shadow-glow">
          <CardContent className="p-12 text-center space-y-6">
            <h3 className="text-3xl sm:text-4xl font-bold">
              Ready to Transform Your Fundraising?
            </h3>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join synagogues already using our platform to manage their donations more effectively
            </p>
            <Button
              size="lg"
              onClick={() => navigate('/register')}
              className="bg-gradient-primary hover:opacity-90 shadow-glow text-lg px-8 py-6 h-auto"
            >
              Register Your Synagogue Today
            </Button>
          </CardContent>
        </Card>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border/50 bg-card/95 backdrop-blur-xl mt-20">
        <div className="container mx-auto px-6 py-8 text-center text-sm text-muted-foreground">
          <p>&copy; 2025 {t('app.title')}. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
