'use client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useAuth } from '@/hooks/useAuth';
import { BarChart, CalendarClock, ListChecks, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Placeholder data for dashboard stats
const stats = [
  { title: 'Active Events', value: '12', icon: CalendarClock, color: 'text-primary' },
  { title: 'Total DJs', value: '8', icon: Users, color: 'text-accent' },
  { title: 'Upcoming Gigs', value: '5', icon: ListChecks, color: 'text-green-500' },
  { title: 'Revenue (Month)', value: '$12,500', icon: BarChart, color: 'text-blue-500' },
];

export default function DashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight font-headline">
          Welcome, {user?.displayName || user?.email || 'User'}!
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your agency&apos;s activities.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="shadow-lg hover:shadow-xl transition-shadow duration-300">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium font-body">
                {stat.title}
              </CardTitle>
              <stat.icon className={`h-5 w-5 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold font-headline">{stat.value}</div>
              {/* <p className="text-xs text-muted-foreground">+20.1% from last month</p> */}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Recent Activity</CardTitle>
            <CardDescription>Overview of recent event updates and check-ins.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">Recent activity feed will be displayed here.</p>
            {/* Placeholder for recent activity feed */}
            <div className="mt-4 space-y-2">
              <div className="flex items-center p-2 bg-secondary/50 rounded-md">
                <CalendarClock className="h-5 w-5 mr-3 text-primary" />
                <p className="text-sm">Event "Summer Vibes" updated.</p>
              </div>
              <div className="flex items-center p-2 bg-secondary/50 rounded-md">
                <Users className="h-5 w-5 mr-3 text-accent" />
                <p className="text-sm">New guest added to "Night Grooves" list.</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="font-headline">Upcoming Events</CardTitle>
            <CardDescription>A quick look at events happening soon.</CardDescription>
          </CardHeader>
          <CardContent>
             <p className="text-muted-foreground">Upcoming events list will be displayed here.</p>
            {/* Placeholder for upcoming events list */}
             <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                <div>
                  <p className="font-semibold text-sm">Tech House Night</p>
                  <p className="text-xs text-muted-foreground">Tomorrow, 10 PM - Club X</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
               <div className="flex items-center justify-between p-2 bg-secondary/50 rounded-md">
                <div>
                  <p className="font-semibold text-sm">Beach Party</p>
                  <p className="text-xs text-muted-foreground">Next Saturday, 2 PM - Sunset Beach</p>
                </div>
                <Button variant="outline" size="sm">View</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      {/* Further sections for charts, DJ performance, etc. can be added here */}
    </div>
  );
}
