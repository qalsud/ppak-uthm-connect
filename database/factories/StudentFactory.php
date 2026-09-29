<?php

namespace Database\Factories;

use App\Models\Centre;
use App\Models\Student;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Student>
 */
class StudentFactory extends Factory
{
    protected $model = Student::class;

    public function definition(): array
    {
        return [
            'name' => fake()->name(),
            'age' => fake()->numberBetween(4, 6),
            'class' => fake()->randomElement(Student::CLASSES),
            'parent_id' => null,
            // Default to the first centre so tests exercise the scoped path.
            'centre_id' => Centre::query()->orderBy('id')->value('id'),
        ];
    }

    /** Place the child at a specific centre. */
    public function atCentre(int $centreId): static
    {
        return $this->state(fn () => ['centre_id' => $centreId]);
    }
}
