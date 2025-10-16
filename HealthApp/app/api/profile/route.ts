import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"
import { verifyAuth } from "@/lib/auth"
import { hashPassword } from "@/lib/password"
import { ObjectId } from "mongodb"

export async function GET(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const db = await getDatabase()
    const userData = await db
      .collection("users")
      .findOne({ _id: new ObjectId(user.userId) }, { projection: { password: 0 } })

    if (!userData) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({ user: userData })
  } catch (error) {
    console.error("[v0] Get profile error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const user = await verifyAuth()
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { name, phone, dateOfBirth, gender, address, specialization, department, currentPassword, newPassword } = body

    const db = await getDatabase()

    // Build update object
    const updateData: any = {
      updatedAt: new Date(),
    }

    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (dateOfBirth) updateData.dateOfBirth = dateOfBirth
    if (gender) updateData.gender = gender
    if (address) updateData.address = address
    if (specialization) updateData.specialization = specialization
    if (department) updateData.department = department

    // Handle password change
    if (currentPassword && newPassword) {
      const userData = await db.collection("users").findOne({ _id: new ObjectId(user.userId) })

      if (!userData) {
        return NextResponse.json({ error: "User not found" }, { status: 404 })
      }

      // Verify current password
      const bcrypt = await import("bcryptjs")
      const isValidPassword = await bcrypt.compare(currentPassword, userData.password)

      if (!isValidPassword) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }

      // Hash new password
      updateData.password = await hashPassword(newPassword)
    }

    // Update user profile
    const result = await db.collection("users").updateOne({ _id: new ObjectId(user.userId) }, { $set: updateData })

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Fetch updated user data
    const updatedUser = await db
      .collection("users")
      .findOne({ _id: new ObjectId(user.userId) }, { projection: { password: 0 } })

    return NextResponse.json({
      message: "Profile updated successfully",
      user: updatedUser,
    })
  } catch (error) {
    console.error("[v0] Update profile error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
